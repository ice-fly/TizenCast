/// Implements the WebSocket receiver protocol for TizenBrew
class FCastReceiver {
    constructor(port = 46899) {
        this.port = port;
        this.events = {};
        this.socket = null;
        this.isStreaming = false;
    }
    on(event, callback) {
        this.events[event] = callback;
    }
    emit(event, data) {
        if (this.events[event]) this.events[event](data);
    }
    start() {
        return new Promise((resolve, reject) => {
            try {
                console.log(`FCast: Starting receiver on port ${this.port}`);
                this.setupServer();
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }

    setupServer() {
        const OpCodes = {
            Play: 1,
            Pause: 2,
            Stop: 3,
            Seek: 4,
            Volume: 5,
            Stream: 6
        };
        this.handleMessage = (msg) => {
            const data = JSON.parse(msg);
            switch (data.op) {
                case OpCodes.Stream:
                    this.isStreaming = true;
                    this.emit('stream', { url: data.url });
                    break;
                case OpCodes.Play:
                    this.emit('play');
                    break;
                case OpCodes.Pause:
                    this.emit('pause');
                    break;
                case OpCodes.Stop:
                    this.isStreaming = false;
                    this.emit('stop');
                    break;
                case OpCodes.Seek:
                    this.emit('seek', data.value);
                    break;
                case OpCodes.Volume:
                    this.emit('volume', data.value);
                    break;
            }
        };
    }
    stop() {
        this.isStreaming = false;
        this.emit('stop');
    }
}
