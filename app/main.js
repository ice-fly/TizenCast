/// Bridges FCast SDK to Tizen Video Player
(function() {
    'use strict';
    const videoElement = document.getElementById('player');
    let receiver = null;

    function init() { 
        /// Init Receiver Port 46899 is the standard FCast port
        console.log("TizenCast: Initializing FCast Receiver...");
        receiver = new FCastReceiver();
        receiver.on('connect', (client) => { //On client connected
            console.log("TizenCast: Connected to " + client.name);
            window.dispatchEvent(new CustomEvent('fcast-receive-start'));// Notify UI
        });
        receiver.on('stream', (content) => { //On stream started
            console.log("TizenCast: Stream received", content);
            if (content && content.url) { // Pass the data to cast.html UI logic
                window.dispatchEvent(new CustomEvent('fcast-stream-start', { 
                    detail: { url: content.url } 
                }));
            }
        });
        /// Playback Controls (Commands from Android)
        receiver.on('play', () => videoElement.play());
        receiver.on('pause', () => videoElement.pause());
        receiver.on('seek', (time) => { videoElement.currentTime = time; });
        receiver.on('volume', (vol) => { videoElement.volume = vol; });
        receiver.on('stop', () => { //On stop / disconnect
            console.log("TizenCast: Stopping stream.");
            window.dispatchEvent(new CustomEvent('fcast-stream-stop'));
        });

        receiver.start().then(() => { //On start the Service
            updateIP();
        }).catch(err => {
            console.error("TizenCast: Start failed", err);
        });
    }

    /// Helper to show IP on screen 
    function updateIP() {
        const ipDisplay = document.getElementById('ip-info');
        if (!ipDisplay) return;
        try {
            // Tizen-specific way to get local IP
            var network = tizen.systeminfo.getPropertyValue("NETWORK", function(info) {
                ipDisplay.innerText = "IP: " + info.ipAddress + " | Port: 46899";
            });
        } catch (e) {
            ipDisplay.innerText = "Check network connection";
        }
    }
    // Standard Tizen startup
    window.onload = init;
    // Export receiver to window so cast.html can call stop()
    window.fcast = receiver;
})();
