import { pack, unpackMultiple } from "msgpackr";
import { isMsgId, MsgId } from "./MsgId";

class HostBridge {
    private ws?: WebSocket;
    private callbacks: Map<MsgId, (data: unknown[]) => void>;
    public onEnable?: () => void;
    public onDisable?: () => void;
    public onOpen?: () => void;
    public onClose?: () => void;
    private playList?: PlaybackMessage[];
    private playbackController?: AbortController;
    private enabled_: boolean;
    private reconnectSpan_: number;
    private port_: number;
    private reconnectHandle: number;

    public constructor() {
        this.callbacks = new Map();

        this.enabled_ = options.get('app_enabled', false);
        this.reconnectSpan_ = options.get('app_reconnect_span', 60);
        this.port_ = options.get('app_port', 5170);
        this.reconnectHandle = 0;

        if (this.enabled_) {
            this.startConnection();
        }
    }

    private startConnection() {
        if (this.reconnectHandle) {
            return;
        }

        if (this.onEnable) {
            this.onEnable();
        }

        this.reconnectHandle = setTimeout(() => {
            this.openConnection();
            this.reconnectHandle = setInterval(() => {
                this.openConnection();
            }, this.reconnectSpan_ * 1000);
        }, 1000);
    }

    private stopConnection() {
        if (this.reconnectHandle) {
            clearInterval(this.reconnectHandle);
            this.reconnectHandle = 0;

            if (this.onDisable) {
                this.onDisable();
            }
        }

        if (this.ws) {
            this.ws.close();
            this.ws = undefined;
        }
    }

    private openConnection() {
        if (this.ws) {
            return;
        }

        const ws = new WebSocket(`ws://localhost:${this.port_}`);
        ws.binaryType = 'arraybuffer';
        this.ws = ws;

        ws.onopen = _ => {
            console.info('WebCast connection open');

            if (this.onOpen)
                this.onOpen();
        };
        ws.onmessage = e => {
            try {
                this.onMessage(e);
            } catch (err: unknown) {
                console.error('WebCast handler threw an exception:');
                console.error(err);
                ws.close();
                this.ws = undefined;
            }
        };
        ws.onclose = _ => {
            console.info('WebCast connection closed');
            this.ws = undefined;

            if (this.onClose)
                this.onClose();
        };
        ws.onerror = _ => {
            console.info('WebCast connection failed');
            this.ws = undefined;
        };
    }

    public get enabled() {
        return this.enabled_;
    }

    public set enabled(value: boolean) {
        this.enabled_ = value;
        options.set('app_enabled', value);

        if (value) {
            this.startConnection();
        } else {
            this.stopConnection();
        }
    }

    public get reconnectSpan() {
        return this.reconnectSpan_;
    }

    public set reconnectSpan(value: number) {
        value = Math.max(value, 1);
        this.reconnectSpan_ = value;
        options.set('app_reconnect_span', value);
    }

    public get port() {
        return this.port_;
    }

    public set port(value: number) {
        value = Math.max(Math.min(value, 65535), 1024);
        this.port_ = value;
        options.set('app_port', value);
    }

    public isPortValid(value: number) {
        return value >= 1024 && value <= 65535;
    }

    public send2(id: MsgId, obj?: unknown) {
        if (this.ws?.readyState !== WebSocket.OPEN) {
            return;
        }

        try {
            const header = pack(id) as Uint8Array;
            if (obj) {
                const payload = Array.from(pack(obj) as Uint8Array);
                const data = Array.from(header).concat(payload);
                this.ws.send(Uint8Array.from(data));
            } else {
                this.ws.send(header);
            }
        } catch (err: unknown) {
            console.error('WebCast send failed:');
            console.error(err);
        }
    }

    private onMessage(e: { data: unknown }) {
        if (!(e.data instanceof ArrayBuffer)) {
            throw new Error('Received non-binary data');
        }
        const blob = e.data as ArrayBuffer;
        if (blob.byteLength == 0) {
            return;
        }
        const objects = unpackMultiple(new Uint8Array(blob));
        const id = objects[0] as MsgId;
        if (!isMsgId(id)) {
            return;
        }

        const callback = this.callbacks.get(id);
        if (callback) {
            callback(objects.slice(1));
        } else {
            console.warn(`Message ${id} has been discarded`);
        }
    }

    public registerHandler2(id: MsgId, callback: (data: unknown[]) => void) {
        this.callbacks.set(id, callback);
    }

    public get open() {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    public playback(list: PlaybackMessage[], callback?: (status: boolean) => void) {
        list;
        callback;
        console.error('Playback not available');
        alert('Playback not available');
        /*
        if (list.length == 0) {
            console.log('Playback not possible - list is empty');
            return;
        }
        vatsim.stop();

        let i = 0;
        // old version, suffers from queue chocking
        let func = () => {
            const entry = list[i];
            this.onMessage({ data: entry.object});

            i = i + 1;
            if (list.length <= i) {
                console.log('Playback finished');
                return;
            }
            const next = list[i];

            const nextIn = Math.max(next.timestamp - entry.timestamp, 0);
            setTimeout(func, nextIn);
        };

        this.playbackController = new AbortController();
        const signal = this.playbackController.signal;

        // experimental version, throws all requests from next 100ms
        func = () => {
            const baseEntry = list[i];
            let entry = baseEntry;
            do {
                if (signal.aborted) {
                    delete this.playbackController;
                    console.log('Playback aborted');
                    alert('Playback aborted');
                    callback?.call(null, false);
                    return;
                }
                this.onMessage({ data: entry.object});

                i = i + 1;
                if (list.length <= i) {
                    setTimeout(() => {
                        delete this.playbackController;
                        console.log('Playback finished');
                        alert('Playback finished');
                        callback?.call(null, false);
                        hostState.resetApp();
                    }, 2000);
                    return;
                }
                entry = list[i];
            } while (baseEntry.timestamp + 100 > entry.timestamp);

            let nextIn = Math.max(entry.timestamp - baseEntry.timestamp, 0);
            setTimeout(func, nextIn);
        };

        console.log('Playback started');
        callback?.call(null, true);
        func();
        */
    }

    public playbackDefault(callback?: (status: boolean) => void) {
        fetch('/playlist.txt').then((response) => {
            if (!response.ok) {
                console.error(`Failed to fetch playlist: ${response.status} ${response.statusText}`);
                alert(`Failed to fetch playlist: ${response.status} ${response.statusText}`);
            }

            return response.json();
        }).then((value) => {
            this.playback(value, callback);
        }, (reason: Error) => {
            console.error(`Failed to parse playlist: ${reason.name}:${reason.message}`);
            alert(`Failed to parse playlist: ${reason.name}:${reason.message}`);
        });
    }

    public recordPlaylist(callback?: (status: boolean) => void) {
        this.playList = [];
        this.playbackController = new AbortController();
        console.log('Playlist recording started');

        hostState.resetApp();
        callback?.call(null, true);

        const finishFunc = () => {
            console.log(JSON.stringify(hostBridge.finishPlaylist()));
            callback?.call(null, false);
            alert('Playlist recording stopped. Result has been printed to developer console. Sorry :/');
        };
        this.playbackController.signal.onabort = finishFunc;
        setTimeout(finishFunc, 300000);
    }

    public finishPlaylist(callback?: (status: boolean) => void) {
        const playlist = this.playList;
        delete this.playList;
        delete this.playbackController;
        console.log('Playlist recording stopped');
        callback?.call(null, false);
        return playlist;
    }

    public abortPlayback() {
        this.playbackController?.abort();
    }

    public get playbackActive() : boolean {
        return this.playbackController != null;
    }
}

interface PlaybackMessage {
    timestamp: number;
    object: unknown;
}

export default HostBridge;
