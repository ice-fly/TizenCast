class FCastReceiver {
    constructor() {
        this.events = {};
        this.isStreaming = false;
        this.socket = null;
        
        this.OpCodes = {
            Play: 1, 
            Pause: 2, 
            Resume: 3, 
            Stop: 4, 
            Seek: 5,
            PlaybackUpdate: 6, 
            SetVolume: 8, 
            Ping: 12, 
            Pong: 13, 
            Initial: 14
        };
    }

    setSocket(socket) {
        this.socket = socket;
        if (this.socket) {
            this.socket.binaryType = 'arraybuffer';
        }
    }

    on(event, callback) { this.events[event] = callback; }
    emit(event, data) { if (this.events[event]) this.events[event](data); }
    sendPlaybackUpdate(currentTime, duration, isPaused) {
        this.sendMessage(this.OpCodes.PlaybackUpdate, {
            time: currentTime || 0,
            duration: duration || 0,
            state: isPaused ? 2 : 1, // 1 = Playing, 2 = Paused
            speed: 1.0
        });
    }

    sendMessage(opcode, body = {}) {
        try {
            if (!this.socket || this.socket.readyState !== 1) return;

            const encoder = new TextEncoder();
            const bodyBytes = encoder.encode(JSON.stringify(body));
            const packet = new ArrayBuffer(5 + bodyBytes.byteLength);
            const view = new DataView(packet);

            view.setUint32(0, 1 + bodyBytes.byteLength, true); 
            view.setUint8(4, opcode); 
            new Uint8Array(packet, 5).set(bodyBytes);

            this.socket.send(packet);
        } catch (err) {
            console.error("FCast SDK: Send error", err);
        }
    }

    handleMessage(event) {
        try {
            if (!event.data || !(event.data instanceof ArrayBuffer)) return;
            if (event.data.byteLength < 5) return;

            const view = new DataView(event.data);
            const opcode = view.getUint8(4);
            const bodyBytes = new Uint8Array(event.data, 5);
            
            let body = {};
            try {
                const decoder = new TextDecoder("utf-8");
                const jsonStr = decoder.decode(bodyBytes);
                body = jsonStr ? JSON.parse(jsonStr) : {};
            } catch (e) {
                console.warn("FCast SDK: JSON parse failed for OpCode", opcode);
            }

            this.processCommand(opcode, body);
        } catch (err) {
            console.error("FCast SDK: Packet processing crash prevented", err);
        }
    }

    processCommand(opcode, body) { //Logic
        switch (opcode) {
            case this.OpCodes.Ping:
                this.sendMessage(this.OpCodes.Pong);
                break;
            case this.OpCodes.Initial:
                this.emit('connect', { name: body.displayName || "Mobile Device" });
                break;
            case this.OpCodes.Play:
                if (body.url) {
                    this.isStreaming = true;
                    this.emit('stream', { url: body.url });
                }
                break;
            case this.OpCodes.Pause:
                this.emit('pause');
                break;
            case this.OpCodes.Resume:
                this.emit('play');
                break;
            case this.OpCodes.Stop:
                this.stop();
                break;
            case this.OpCodes.Seek:
                this.emit('seek', body.time || 0);
                break;
            case this.OpCodes.SetVolume:
                this.emit('volume', body.volume !== undefined ? body.volume : 1);
                break;
        }
    }

    start() { 
        return Promise.resolve(); 
    }

    stop() {
        this.isStreaming = false;
        this.emit('stop');
    }
}
