class FCastReceiver {
    constructor(port = 46899) {
        this.port = port;
        this.events = {};
        this.isStreaming = false;
        this.socket = null; // Assigned by main.js on connection
        
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

    on(event, callback) { this.events[event] = callback; }
    emit(event, data) { if (this.events[event]) this.events[event](data); }
    
    sendMessage(opcode, body = {}) { //4 byte, 1 byte, JSON
        if (!this.socket || this.socket.readyState !== 1) return;

        const encoder = new TextEncoder();
        const bodyBytes = encoder.encode(JSON.stringify(body));
        const packet = new ArrayBuffer(5 + bodyBytes.byteLength);
        const view = new DataView(packet);

        // FCast v3: Size is OpCode (1) + Body Length
        view.setUint32(0, 1 + bodyBytes.byteLength, true); 
        view.setUint8(4, opcode); 
        new Uint8Array(packet, 5).set(bodyBytes);

        this.socket.send(packet);
    }

    sendPlaybackUpdate(currentTime, duration, isPaused) { // Opcode 6
        this.sendMessage(this.OpCodes.PlaybackUpdate, {
            time: currentTime,
            duration: duration || 0,
            state: isPaused ? 2 : 1, // 1 = Playing, 2 = Paused
            speed: 1.0
        });
    }

    parsePacket(arrayBuffer) {
        const view = new DataView(arrayBuffer);
        const opcode = view.getUint8(4);
        const bodyBytes = new Uint8Array(arrayBuffer, 5);
        const decoder = new TextDecoder("utf-8");
        let body = null;
        
        try { 
            const jsonString = decoder.decode(bodyBytes);
            body = jsonString ? JSON.parse(jsonString) : {}; 
        } catch (e) {
            console.warn("FCast: Body parse failed", e);
        }
        return { opcode, body };
    }

    handleMessage(event) {
        if (!(event.data instanceof ArrayBuffer)) return;
        
        const { opcode, body } = this.parsePacket(event.data);
        
        switch (opcode) {
            case this.OpCodes.Ping:
                this.sendMessage(this.OpCodes.Pong);
                break;
            case this.OpCodes.Initial:
                this.emit('connect', { name: body.displayName });
                break;
            case this.OpCodes.Play:
                this.isStreaming = true;
                this.emit('stream', { url: body.url });
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
                this.emit('seek', body.time);
                break;
            case this.OpCodes.SetVolume:
                this.emit('volume', body.volume);
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
