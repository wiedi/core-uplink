"use strict"

var net      = require('net')
var io       = require('socket.io-client')
var iostream = require('socket.io-stream')

function UplinkClient(server) {
	this.server = server || 'http://localhost:8080'
	this.sock   = io.connect(this.server)
}

UplinkClient.prototype.createTunnel = function(src_port, dst_uuid, dst_port, cb) {
	var self = this
	var s = net.createServer(function(client) {
		var stream = iostream.createStream()
		iostream(self.sock).emit('tunnel', stream, dst_uuid, dst_port)
		client.pipe(stream)
		stream.pipe(client)
		client.on('error', function(err){
			stream.end()
		})
		stream.on('error', function(err){
			client.end()
		})
	})
	s.on('error', function(err) {
		cb(err)
	})
	s.listen(src_port, '127.0.0.1', function() {
		cb(null, s.address())
	})
	return s
}

module.exports = UplinkClient
