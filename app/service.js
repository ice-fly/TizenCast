const WebSocket = require('ws'); 
const wss = new WebSocket.Server({ port: 46899 });
wss.on('connection', (ws) => {
    console.log("FCast Service: Client Connected");

    ws.on('message', (data) => {    });
});
console.log("FCast NodeJS Service Running on 46899");
