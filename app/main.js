(function() {
    'use strict';
    const video = document.getElementById('player');
    let serviceBridge = null;

    function init() {
        // Connect to the internal background service
        serviceBridge = new WebSocket('ws://127.0.0.1:46900');
        serviceBridge.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            handleCommand(msg.opcode, msg.body);
        };

        // Display IP for user
        tizen.systeminfo.getPropertyValue("NETWORK", (info) => {
            document.getElementById('ip-info').innerText = "IP: " + info.ipAddress;
        });
    }

    function handleCommand(opcode, body) {
        switch(opcode) {
            case 1: // Play
                window.dispatchEvent(new CustomEvent('fcast-stream-start', { detail: body }));
                break;
            case 2: video.pause(); break;
            case 3: video.play(); break;
            case 5: video.currentTime = body.time; break;
            case 8: video.volume = body.volume; break;
        }
    }

    window.onload = init;
})();
