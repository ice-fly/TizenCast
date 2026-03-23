(function() {
    'use strict';
    let receiver = null;
    const playerElement = document.getElementById('player');

    function init() {
        receiver = new FCastReceiver();
        const server = new WebSocket('ws://' + window.location.hostname + ':46899');
        
        server.onopen = () => receiver.setSocket(server);

        receiver.on('stream', (content) => {
            window.dispatchEvent(new CustomEvent('fcast-stream-start', { detail: content }));
            playWithAVPlay(content.url);
        });

        receiver.on('pause', () => { webapis.avplay.pause(); });
        receiver.on('play', () => { webapis.avplay.play(); });
        receiver.on('seek', (time) => { webapis.avplay.jumpForward(time * 1000); });

        setInterval(() => {
            if (receiver && receiver.isStreaming && receiver.socket) {
                const currentTime = webapis.avplay.getCurrentTime() / 1000;
                const duration = webapis.avplay.getDuration() / 1000;
                receiver.sendPlaybackUpdate(currentTime, duration, false);
            }
        }, 2000);

        updateIP();
    }

    function playWithAVPlay(url) {
        try {
            webapis.avplay.open(url);
            webapis.avplay.setDisplayRect(0, 0, 1920, 1080); 
            webapis.avplay.prepare();
            webapis.avplay.play();
        } catch (e) {
            console.error("AVPlay Error: ", e);
        }
    }

    function updateIP() {
        tizen.systeminfo.getPropertyValue("NETWORK", function(info) {
            document.getElementById('ip-info').innerText = "IP: " + info.ipAddress + " | Port: 46899";
        });
    }

    window.onload = init;
})();
