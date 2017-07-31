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
	var cb_returned = false
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

	self.sock.on('pong', function(online) {
		if(!online) {
			if(!cb_returned) {
				cb("Client Uplink offline")
				cb_returned = true
			}
			return
		}
		s.on('error', function(err) {
			if(!cb_returned) {
				cb(err)
				cb_returned = true
			}
		})

		s.listen(src_port, '127.0.0.1', function() {
			if(!cb_returned) {
				cb(null, s.address())
				cb_returned = true
			}
		})
	})
	self.sock.emit('ping', dst_uuid)

	setTimeout(function() {
		s.close()
		if(!cb_returned) {
			cb("Uplink Server pong-timeout")
			cb_returned = true
		}
	}, 1000 * 5)

	return s
}

module.exports = UplinkClient
