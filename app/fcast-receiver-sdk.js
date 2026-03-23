class FCastReceiver {
    constructor() {
        this.events = {};
        this.isStreaming = false;
        this.socket = null;
        this.OpCodes = { 
            Play: 1, Pause: 2, Resume: 3, Stop: 4, 
            Seek: 5, PlaybackUpdate: 6, Volume: 8, 
            Ping: 12, Pong: 13, Initial: 14 
        };
    }

    setSocket(socket) {
        this.socket = socket;
        this.socket.binaryType = 'arraybuffer';
        console.log("SDK: Socket Bound & BinaryType set.");
    }

    sendPlaybackUpdate(time, duration, paused) { // OpCode 6 logic
        this.sendMessage(6, {
            time: time || 0,
            duration: duration || 0,
            state: paused ? 2 : 1 // 1 = Playing, 2 = Paused
        });
    }

    sendMessage(opcode, body = {}) {
        if (!this.socket || this.socket.readyState !== 1) return;
        try {
            const bodyBytes = new TextEncoder().encode(JSON.stringify(body));
            const packet = new ArrayBuffer(5 + bodyBytes.byteLength);
            const view = new DataView(packet);
            view.setUint32(0, 1 + bodyBytes.byteLength, true); // Little Endian
            view.setUint8(4, opcode);
            new Uint8Array(packet, 5).set(bodyBytes);
            this.socket.send(packet);
        } catch (e) { console.error("SDK Send Error:", e); }
    }

    handleMessage(data) {
        try {
            const view = new DataView(data);
            const opcode = view.getUint8(4);
            const body = JSON.parse(new TextDecoder().decode(new Uint8Array(data, 5)));
            this.process(opcode, body);
        } catch (e) { console.warn("SDK Parse Error (Malformed Packet):", e); }
    }

    process(op, body) {
        if (op === 14) this.emit('connect', { name: body.displayName || "Phone" });
        if (op === 1) { this.isStreaming = true; this.emit('stream', { url: body.url }); }
        if (op === 2) this.emit('pause');
        if (op === 3) this.emit('play');
        if (op === 5) this.emit('seek', body.time);
        if (op === 8) this.emit('volume', body.volume);
        if (op === 12) this.sendMessage(13); // Ping-Pong
    }

    stop() { this.isStreaming = false; this.emit('stop'); }
    on(ev, cb) { this.events[ev] = cb; }
    emit(ev, data) { if (this.events[ev]) this.events[ev](data); }
}
