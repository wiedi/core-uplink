#!/usr/bin/env node
"use strict"

var app      = require('express')()
var server   = require('http').Server(app)
var io       = require('socket.io')(server)
var iostream = require('socket.io-stream')
var program  = require('commander')

program
	.usage('[-p <port>]')
	.option('-p, --port <port>', 'port [8080]')
	.parse(process.argv)

server.listen(program.port || process.env.UPLINKSRV_PORT || '8080')

app.get('/', function(req, res){
  res.json({'status': 'OK'})
})

app.get('/sats', function(req, res){
  res.json(Object.keys(sats))
})


var sats = {}

function is_online(uuid) {
	return !(Object.keys(sats).indexOf(uuid) < 0)
}

io.on('connection', function (socket) {
	var authed = false
	var uuid   = undefined
	socket.on('auth', function(cuuid) {
		uuid = cuuid
		if(uuid in sats) {
			sats[uuid].disconnect()
			console.log('duplicate disconnected: ' + uuid)
		}
		sats[uuid] = socket
		authed = true
	})
	socket.on('disconnect', function () {
		if(authed) {
			delete sats[uuid]
		}
	})

	socket.on('ping', function(cuuid) {
		socket.emit('pong', is_online(cuuid))
	})


	iostream(socket).on('tunnel', function(stream, target, port) {
		if(!is_online(target)) {
			stream.end()
			return
		}
		var sat_stream = iostream.createStream()
		iostream(sats[target]).emit('tunnel', sat_stream, port)
		sat_stream.pipe(stream).pipe(sat_stream)

		sat_stream.on('error', function(err){
			stream.end()
		})
		stream.on('error', function(err){
			sat_stream.end()
		})
	})
})