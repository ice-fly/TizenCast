try { require('ws'); } catch(e) { console.error("WS module missing!"); }
const WebSocket = require('ws');
const fcastServer = new WebSocket.Server({ port: 46899 });
const uiServer = new WebSocket.Server({ port: 46900 }); 
let uiSocket = null;
uiServer.on('connection', (ws) => {
    uiSocket = ws;
    console.log("Service: UI Bridge Connected");
});
fcastServer.on('connection', (ws) => {
    console.log("Service: Phone Connected");

    ws.on('message', (data) => {
        try {
            const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
            const opcode = view.getUint8(4);
            const bodyBytes = data.slice(5);
            const body = JSON.parse(bodyBytes.toString());
            if (uiSocket && uiSocket.readyState === WebSocket.OPEN) {
                uiSocket.send(JSON.stringify({ opcode, body }));
            }
        } catch (e) {
            console.error("Service: Parse Error", e);
        }
    });
});
console.log("FCast Service: Ports 46899 (External) and 46900 (Internal) Active");
