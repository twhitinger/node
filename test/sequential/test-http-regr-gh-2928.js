// This test is designed to fail with a segmentation fault in Node.js 4.1.0 and
// execute without issues in Node.js 4.1.1 and up.

'use strict';
const common = require('../common');
const assert = require('assert');
const httpCommon = require('_http_common');
const HTTPParser = process.binding('http_parser').HTTPParser;
const net = require('net');

const COUNT = httpCommon.parsers.max + 1;

const parsers = new Array(COUNT);
for (var i = 0; i < parsers.length; i++)
  parsers[i] = httpCommon.parsers.alloc();

var gotRequests = 0;
var gotResponses = 0;

function execAndClose() {
  process.stdout.write('.');
  if (parsers.length === 0)
    return;

  const parser = parsers.pop();
  parser.reinitialize(HTTPParser.RESPONSE);
  const socket = net.connect(common.PORT);
  parser.consume(socket._handle._externalStream);

  parser.onIncoming = function onIncoming() {
    process.stdout.write('+');
    gotResponses++;
    parser.unconsume(socket._handle._externalStream);
    httpCommon.freeParser(parser);
    socket.destroy();
    setImmediate(execAndClose);
  };
}

var server = net.createServer(function(c) {
  if (++gotRequests === COUNT)
    server.close();
  c.end('HTTP/1.1 200 OK\r\n\r\n', function() {
    c.destroySoon();
  });
}).listen(common.PORT, execAndClose);

process.on('exit', function() {
  assert.equal(gotResponses, COUNT);
});
