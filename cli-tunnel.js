#!/usr/bin/env node
"use strict"

var UplinkClient = require('./cli')
var program      = require('commander')

program
	.usage('[-p <source port>] [-s <server>] <destination identity> <destination port>')
	.option('-s, --server <uri>', 'server [http://localhost:8080]')
	.option('-p, --port <port>',  'source port [0]')
	.parse(process.argv)

if(program.args.length < 2) {
	console.error('parameter missing')
	program.outputHelp()
	process.exit(1)
}

var uplink = new UplinkClient(program.server || 'http://localhost:8080')
uplink.createTunnel(program.port || '0', program.args[1], program.args[2], function(err, s) {
	if(err) {
		console.error(err)
		process.exit(2)
	}
	console.log('Listening on port ' + s.port)
})