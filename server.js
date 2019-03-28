"use strict";
let Stream = require('stream')
let Docker = require('dockerode')
let docker = new Docker({ socketPath: '/var/run/docker.sock' })
let moduleDocker = require('./moduleDocker');

// Port where we'll run the websocket server
var webSocketsServerPort = 1337;

// websocket and http servers
var webSocketServer = require('websocket').server;
var http = require('http');

/**
 * Global variables
 */
// latest 100 messages
var history = [];
// list of currently connected clients (users)
var clients = [];

let containeurs = {};
/**
 * Helper function for escaping input strings
 */
function htmlEntities(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Array with some colors
var colors = ['red', 'green', 'blue', 'magenta', 'purple', 'plum', 'orange'];
// ... in random order
colors.sort(function (a, b) { return Math.random() > 0.5; });

/**
 * HTTP server
 */
var server = http.createServer(function (request, response) {
    // Not important for us. We're writing WebSocket server,
    // not HTTP server
});
server.listen(webSocketsServerPort, function () {
    console.log((new Date()) + " Server is listening on port "
        + webSocketsServerPort);
});

// function exec(container, cmd) {

//     let s = new Stream.PassThrough();

//     var options = {
//         Cmd: ['bash', '-c', cmd],
//         Env: [],
//         AttachStdout: true,
//         AttachStderr: true
//     };
    
//     container.exec(options, function (err, exec) {
//         if (err) return;
//         exec.start(function (err, stream) {
//             if (err) return;
    
//             container.modem.demuxStream(stream, s, s);
    
//         });
//     });

//     return s;
// }


/**
 * WebSocket server
 */
var wsServer = new webSocketServer({
    // WebSocket server is tied to a HTTP server. WebSocket
    // request is just an enhanced HTTP request. For more info 
    // http://tools.ietf.org/html/rfc6455#page-6
    httpServer: server
});

var optsc = {
    'Hostname': '',
    'User': '',
    'AttachStdin': true,
    'AttachStdout': true,
    'AttachStderr': true,
    'Tty': true,
    'OpenStdin': true,
    'StdinOnce': false,
    'Env': null,
    'Cmd': ['bash'],
    'Dns': ['8.8.8.8', '8.8.4.4'],
    'Image': 'ubuntu',
    'Volumes': {},
    'VolumesFrom': []
};

// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on('request', function (request) {
    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');

    // accept connection - you should check 'request.origin' to
    // make sure that client is connecting from your website
    // (http://en.wikipedia.org/wiki/Same_origin_policy)
    var connection = request.accept(null, request.origin);
    // we need to know client index to remove them on 'close' event
    var index = clients.push(connection) - 1;
    var userName = false;
    var userColor = false;

    console.log((new Date()) + ' Connection accepted.');

    // send back chat history
    if (history.length > 0) {
        connection.sendUTF(
            JSON.stringify({ type: 'history', data: history }));
    }

    // user sent some message
    connection.on('message', function (message) {
        if (message.type === 'utf8') { // accept only text
            // first message sent by user is their name

            if (userName === false) {
                // remember user name
                userName = htmlEntities(message.utf8Data);


                console.log("Creating containeur for " + userName + "...");
                docker.createContainer(optsc)
                    .then(container => {
                        var attach_opts = {
                            stream: true,
                            stdin: true,
                            stdout: true,
                            stderr: true
                        };

                        //Attach here

                        container.attach(attach_opts, (err, stream) => {
                            process.stdin.pipe(stream); //Truc à modifier plus tard
                            
                            stream.on('data', key => {
                                let obj = {
                                    time: (new Date()).getTime(),
                                    text: htmlEntities(key),
                                    author: userName,
                                    color: userColor
                                };
                                let json = JSON.stringify({
                                    type: 'message',
                                    data: obj
                                });
                                clients[index].sendUTF(json);
                            })
                        
                            console.log("Starting containeur...");
                            container.start()
                            .then(container => {
                                containeurs[userName] = container;
                                console.log("Containeur for " + userName + " succefully created and ready !");
                            })
                        });
                    })


                // get random color and send it back to the user
                userColor = colors.shift();
                connection.sendUTF(
                    JSON.stringify({
                        type: 'color',
                        data: userColor
                    }));

                console.log((new Date()) + ' User is known as: ' + userName +
                    ' with ' + userColor + ' color.');
            }
        }
    });

    // user disconnected
    connection.on('close', function (connection) {
        if (userName !== false && userColor !== false) {
            console.log((new Date()) + " Peer "
                + connection.remoteAddress + " disconnected.");
            
            console.log("Removing container of " + userName);    
            containeurs[userName].remove();
            console.log("Containeur succesfully removed !");
            

            // remove user from the list of connected clients
            clients.splice(index, 1);
            // push back user's color to be reused by another user
            colors.push(userColor);
        }
    });
});