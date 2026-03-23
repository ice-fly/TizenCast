(function() {
    'use strict';
    
    const videoElement = document.getElementById('player');
    let receiver = null;

    function init() { 
        console.log("TizenCast: Initializing...");
        
        receiver = new FCastReceiver();

        receiver.on('connect', (client) => { //On connection established
            console.log("TizenCast: Connected to " + client.name);
            window.dispatchEvent(new CustomEvent('fcast-receive-start'));
        });

        receiver.on('stream', (content) => { //On stream received
            if (content && content.url) {
                window.dispatchEvent(new CustomEvent('fcast-stream-start', { 
                    detail: { url: content.url } 
                }));
            }
        });
        //Transport Controls
        receiver.on('play', () => videoElement.play());
        receiver.on('pause', () => videoElement.pause());
        receiver.on('seek', (time) => { videoElement.currentTime = time; });
        receiver.on('volume', (vol) => { videoElement.volume = vol; });
        
        receiver.on('stop', () => {
            window.dispatchEvent(new CustomEvent('fcast-stream-stop'));
        });

        setInterval(() => { //OpCode 6 sync
            if (receiver && receiver.isStreaming && receiver.socket) {
                receiver.sendPlaybackUpdate(
                    videoElement.currentTime, 
                    videoElement.duration, 
                    videoElement.paused
                );
            }
        }, 2000);

        receiver.start().then(() => {
            updateIP();
        });
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
