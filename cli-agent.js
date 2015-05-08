#!/usr/bin/env node
"use strict"

var UplinkClient = require('./cli')
var program      = require('commander')
var bodyParser   = require('body-parser')
var app          = require('express')()

program
	.usage('[-t <timeout>] [-p <api port>] [-s <server>]')
	.option('-s, --server <uri>',   'server [http://localhost:8080]')
	.option('-p, --port <port>',    'api port [8000]')
	.option('-t, --timeout <time>', 'time in seconds before a tunnel gets removed [1800]')
	.parse(process.argv)

var tunnels = {}
var timeout = (program.timeout ? program.timeout * 1000 : 1000 * 60 * 30)

app.use(bodyParser.json())

app.get('/', function (req, res) {
	res.send('Uplink Tunnel Agent ready.')
})

app.post('/tunnel/:target/:port/', function(req, res) {
	var dst_uuid = req.params.target
	var dst_port = req.params.port
	var sock = uplink.createTunnel('0', dst_uuid, dst_port, function(err, s) {
		if(err) {
			res.status(500).json({"status": "error"})
			return
		}
		res.json({"status": "success", "port": s.port})
	})
	var key = dst_uuid + ':' + dst_port
	if(key in tunnels) {
		clearTimeout(tunnels[key])
	}
	tunnels[key] = setTimeout(function() {
		sock.close()
		delete tunnels[key]
	}, timeout)
})

var uplink = new UplinkClient(program.server || 'http://localhost:8080')
app.listen(program.port || '8000')
