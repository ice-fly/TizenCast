class FCastReceiver {
    constructor(port = 46899) {
        this.port = port;
        this.events = {};
        this.isStreaming = false;
        this.socket = null;
        
        this.OpCodes = {
            Play: 1, Pause: 2, Resume: 3, Stop: 4, Seek: 5,
            PlaybackUpdate: 6, SetVolume: 8, Ping: 12, Pong: 13, Initial: 14
        };
    }

    on(event, callback) { this.events[event] = callback; }
    emit(event, data) { if (this.events[event]) this.events[event](data); }

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
            console.error("FCast SDK: Failed to send packet:", err);
        }
    }

    handleMessage(event) {
        try {
            if (!(event.data instanceof ArrayBuffer)) { // Validate that we actually received binary data
                throw new Error("Received non-binary data. FCast v3 requires ArrayBuffer.");
            }
            if (event.data.byteLength < 5) { //Packet must be at least 5 bytes (4 size + 1 opcode)
                throw new Error(`Packet too small: ${event.data.byteLength} bytes`);
            }
            const { opcode, body } = this.parsePacket(event.data);

            if (!Object.values(this.OpCodes).includes(opcode)) {// Validate OpCode existence
                console.warn(`FCast SDK: Received unknown OpCode (${opcode}). Ignoring.`);
                return;
            }
            this.processOpCode(opcode, body);
        } catch (err) {
            console.error("FCast SDK Error Boundary: Malformed packet received.", err);
        }
    }

    parsePacket(arrayBuffer) {
        const view = new DataView(arrayBuffer);
        const opcode = view.getUint8(4);
        const bodyBytes = new Uint8Array(arrayBuffer, 5);
        
        let body = {};
        if (bodyBytes.length > 0) {
            try {
                const decoder = new TextDecoder("utf-8");
                body = JSON.parse(decoder.decode(bodyBytes));
            } catch (jsonErr) {
                console.warn("FCast SDK: Failed to parse JSON body for opcode", opcode);
            }
        }
        return { opcode, body };
    }

    processOpCode(opcode, body) {
        switch (opcode) {
            case this.OpCodes.Ping:
                this.sendMessage(this.OpCodes.Pong);
                break;
            case this.OpCodes.Initial:
                this.emit('connect', { name: body.displayName || "Unknown Device" });
                break;
            case this.OpCodes.Play:
                if (!body.url) throw new Error("Play command missing URL");
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
                this.emit('seek', body.time || 0);
                break;
            case this.OpCodes.SetVolume:
                this.emit('volume', body.volume !== undefined ? body.volume : 1);
                break;
        }
    }

    start() { return Promise.resolve(); }
    
    stop() {
        this.isStreaming = false;
        this.emit('stop');
    }
}
