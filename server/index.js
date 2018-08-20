"use strict";
exports.__esModule = true;
var http_1 = require("http");
var Express = require('express');
var socketIo = require('socket.io');
var isNumber = function (a) { return typeof a === 'number' && !isNaN(a); };
var validAction = function (a) { return a === 'build' || a === 'destroy'; };
var isNatural = function (a) { return isNumber(a) && Math.round(a) === a; };
var validCoordinate = function (c) {
    if (typeof c !== 'string')
        return false;
    var _a = c.split(',').map(function (x) { return parseInt(x, 10); }), x = _a[0], y = _a[1], z = _a[2];
    return isNatural(x) && isNatural(y) && isNatural(z);
};
function start() {
    var express = Express();
    var server = http_1.createServer(express);
    var sockets = socketIo(server);
    var map = {};
    express.get('/all', function (req, res) {
        res.send(JSON.stringify(Object.keys(map).filter(function (k) { return !!map[k]; })));
    });
    var listen = function () {
        server.listen(8080, '0.0.0.0', function () {
            console.log(">> listening on 8080");
        });
        sockets.on('connect', function (socket) {
            socket.on('message', function (data) {
                try {
                    var m = JSON.parse(data);
                    if (!validAction(m.a) || !validCoordinate(m.c)) {
                        console.log("[server] ignore " + JSON.stringify(m));
                    }
                    map[m.c] = m.a === 'build' ? true : undefined;
                    console.log("[server] " + m.a + " " + m.c);
                    sockets.emit('message', m);
                }
                catch (e) {
                    console.log("[server] invalid message " + data);
                    return;
                }
            });
        });
    };
    return { express: express, server: server, sockets: sockets, listen: listen };
}
if (!module.parent) {
    var server = start();
    server.listen();
}
