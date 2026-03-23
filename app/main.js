(function() {
    'use strict';
    let receiver = null;
    const playerElement = document.getElementById('player');

    function init() { 
        console.log("TizenCast: Initializing v0.5...");
        receiver = new FCastReceiver();
        receiver.on('connect', (client) => {
            console.log("TizenCast: Connected to " + client.name);
            //TODO: connection toast
        });

        receiver.on('stream', (content) => {
            if (content && content.url) {
                console.log("TizenCast: Starting Stream -> " + content.url);
                window.dispatchEvent(new CustomEvent('fcast-stream-start', { 
                    detail: { url: content.url } 
                }));
            }
        });
        //Transport Controls
        receiver.on('play', () => playerElement.play());
        receiver.on('pause', () => playerElement.pause());
        receiver.on('seek', (time) => { playerElement.currentTime = time; });
        receiver.on('volume', (vol) => { playerElement.volume = vol; });
        
        receiver.on('stop', () => {
            window.dispatchEvent(new CustomEvent('fcast-stream-stop'));
        });

        setInterval(() => {
            if (receiver && receiver.isStreaming && receiver.socket) {
                const duration = isFinite(playerElement.duration) ? playerElement.duration : 0;
                receiver.sendPlaybackUpdate(
                    playerElement.currentTime || 0, 
                    duration, 
                    playerElement.paused
                );
            }
        }, 2000);

        startFcastServer();
        updateIP();
    }

    function startFcastServer() {
        try {
            const wss = new WebSocketServer({ port: 46899 });
            wss.on('connection', function(socket) {
                console.log("TizenCast: Incoming Connection established.");
                receiver.setSocket(socket);
                socket.on('message', (data) => {
                    receiver.handleMessage(data);
                });
                socket.on('close', () => {
                    console.log("TizenCast: Connection closed by sender.");
                    receiver.stop();
                });
            });
        } catch (err) {
            console.error("TizenCast: Server Error", err);
        }
    }

    function updateIP() { //Display IP
        const ipDisplay = document.getElementById('ip-info');
        if (!ipDisplay) return;
        try {
            tizen.systeminfo.getPropertyValue("NETWORK", function(info) {
                ipDisplay.innerText = "IP: " + info.ipAddress + " | Port: 46899";
            });
        } catch (e) {
            ipDisplay.innerText = "Check Network Settings";
        }
    }

    window.onload = init;
    window.fcast = receiver;
})();
