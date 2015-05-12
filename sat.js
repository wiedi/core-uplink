#!/usr/bin/env node
"use strict"

var fs           = require('fs')
var net          = require('net')
var EventEmitter = require('events').EventEmitter
var util         = require('util')
var io           = require('socket.io-client')
var iostream     = require('socket.io-stream')
var uuid         = require('uuid')
var program      = require('commander')

program
	.usage('[-s <server>] [-i <identityFile>] [-p <port>]')
	.option('-s, --server <url>',    'URL to websocket server')
	.option('-i, --identity <file>', 'file to persist the uuid')
	.option('-p, --port <port>',     'port for control interface (disabled if not specified)')
	.parse(process.argv)


function UplinkSatellite(server, ident) {
	var self = this
	this.connections = 0
	this.server = server
	this.uuid   = ident
	
	this.sock = io.connect(this.server)
	this.sock.on('connect', function() {
		self.sock.emit('auth', self.uuid)
	})

	iostream(this.sock).on('tunnel', function(stream, port) {
		var client = net.connect({host: 'localhost', port: port}, function() {
			client.pipe(stream)
			stream.pipe(client)
			self.connections++
			self.emit('updateConnections', self.connections)
		})
		client.on('end', function() {
			self.connections--
			self.emit('updateConnections', self.connections)
		})
		client.on('error', function(err){
			stream.end()
		})
		stream.on('error', function(err){
			client.end()
		})
	})
}

util.inherits(UplinkSatellite, EventEmitter)

UplinkSatellite.prototype.setIdentity = function(ident) {
	this.uuid = ident
	this.sock.close()
	this.sock.connect(this.server)
}

function ControlInterface(server, identityFile, port) {
	var self = this
	var app  = require('express')()
	var srv  = require('http').Server(app)
	self.io  = require('socket.io')(srv)
	self.loadIdentity(identityFile)
	self.uplink = new UplinkSatellite(server, self.identity)

	app.get('/', function (req, res) {
		res.sendFile(__dirname + '/control.html')
	})

	self.io.on('connection', function(socket) {
		socket.emit('identity', self.identity)
		socket.emit('updateConnections', self.uplink.connections)
		socket.on('newIdentity', function() {
			self.identity = uuid.v4()
			self.uplink.setIdentity(self.identity)
			self.io.emit('identity', self.identity)
			fs.writeFileSync(identityFile, self.identity)
		})
	})

	self.uplink.on('updateConnections', function(count) {
		self.io.emit('updateConnections', count)
	})

	if(!!port) {
		srv.listen(port)
	}
}

ControlInterface.prototype.loadIdentity = function(identityFile) {
	this.identity = uuid.v4()
	try {
		this.identity = fs.readFileSync(identityFile, {encoding: 'utf-8'})
	} catch(e) {
		console.log('generated new id')
	}
	fs.writeFileSync(identityFile, this.identity)

}

function main(options) {
	var server       = options.server   || process.env.UPLINK_SERVER       || 'http://localhost:8080'
	var identityFile = options.identity || process.env.UPLINK_IDENTITYFILE || __dirname + '/identity.dat'
	var port         = options.port     || process.env.UPLINK_PORT
	new ControlInterface(server, identityFile, port)
}

main(program)
