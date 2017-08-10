#!/usr/bin/env node
"use strict"

var UplinkClient = require('./cli')
var program      = require('commander')
var bodyParser   = require('body-parser')
var app          = require('express')()

program
	.usage('[-t <timeout>] [-p <api port>] [-s <server>] [-k <key>]')
	.option('-s, --server <uri>',   'server [http://localhost:8080]')
	.option('-p, --port <port>',    'api port [8000]')
	.option('-k, --key <key>', 'key')
	.option('-t, --timeout <time>', 'time in seconds before a tunnel gets removed [1800]')
	.parse(process.argv)

var timeout = (program.timeout ? program.timeout * 1000 : 1000 * 60 * 30)
var secret = program.key || ''
app.use(bodyParser.json())

app.get('/', function (req, res) {
	res.send('Uplink Tunnel Agent ready.')
})

app.post('/tunnel/:target/:port/', function(req, res) {
	var dst_uuid = req.params.target
	var dst_port = req.params.port
	var uplink = new UplinkClient(program.server || 'http://localhost:8080')

	var sock = uplink.createTunnel('0', dst_uuid, dst_port, secret, function(err, s) {
		if(err) {
			res.status(500).json({"status": "error", "error": String(err)})
			return
		}
		res.json({"status": "success", "port": s.port})
	})
	setTimeout(function() {
		sock.close()
		uplink.sock.close()
	}, timeout)
})

app.listen(program.port || '8000', '127.0.0.1')
