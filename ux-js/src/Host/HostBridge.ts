import { pack, unpackMultiple } from "msgpackr";
import { isMsgId, MsgId } from "./MsgId";

class HostBridge {
    private ws?: WebSocket;
    private callbacks: Map<MsgId, (data: unknown[]) => void>;
    public onEnable?: () => void;
    public onDisable?: () => void;
    public onOpen?: () => void;
    public onClose?: () => void;
    private enabled_: boolean;
    private reconnectSpan_: number;
    private port_: number;
    private reconnectHandle: number;
    private lastReconnect: number;

    public constructor() {
        this.callbacks = new Map();

        this.enabled_ = options.get('app_enabled', false);
        this.reconnectSpan_ = options.get('app_reconnect_span', 60);
        this.port_ = options.get('app_port', 5170);
        this.reconnectHandle = 0;
        this.lastReconnect = 0;

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

        this.lastReconnect = 0;
        this.reconnectHandle = setInterval(() => {
            const now = Date.now();
            if ((now - this.lastReconnect) < (this.reconnectSpan_ * 1000)) {
                return;
            }
            this.lastReconnect = now;
            this.openConnection();
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
                const data = e.data as unknown;
                if (!(data instanceof ArrayBuffer)) {
                    throw new Error('Received non-binary data');
                }
                const blob = data as ArrayBuffer;
                if (blob.byteLength == 0) {
                    return;
                }
                this.onMessage(new Uint8Array(blob));
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

    public onMessage(blob: Uint8Array) {
        replay.onHostMessage(blob);
        const objects = unpackMultiple(blob);
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
}

export default HostBridge;
