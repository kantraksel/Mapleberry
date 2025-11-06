import { pack, unpack } from "msgpackr";
import { LiveNetworkData } from "../Network/VATSIM";

type PlaybackMessage = [ number, MessageType, Uint8Array ];

enum MessageType {
    Host,
    Network,
}

class SystemState {
    host: boolean;
    network: boolean;

    constructor() {
        this.host = false;
        this.network = false;
    }

    stash() {
        this.host = hostBridge.enabled;
        this.network = vatsim.enabled;
    }

    restore() {
        hostBridge.enabled = this.host;
        vatsim.enabled = this.network;
    }
}

class Replay {
    private playlist: PlaybackMessage[];
    private controller?: AbortController;
    private blobUrl?: string;
    private systemState: SystemState;

    public constructor() {
        this.playlist = [];
        this.systemState = new SystemState;
    }

    public playback(blob: ArrayBuffer, callback?: (status: boolean) => void) {
        const list = unpack(blob) as PlaybackMessage[];
        if (list.length == 0) {
            console.log('Playback not possible - list is empty');
            return;
        }
        this.systemState.stash();
        vatsim.stop();
        hostBridge.enabled = false;

        this.controller = new AbortController();
        const signal = this.controller.signal;

        let i = 0;
        const func = () => {
            const baseEntry = list[i];
            let entry = baseEntry;
            do {
                if (signal.aborted) {
                    this.controller = undefined;
                    console.log('Playback aborted');
                    alert('Playback aborted');
                    callback?.call(null, false);
                    return;
                }
                switch (entry[1]) {
                    case MessageType.Host: {
                        hostBridge.onMessage(entry[2]);
                        break;
                    }
                    case MessageType.Network: {
                        const obj = unpack(entry[2]);
                        network.updateState(obj);
                        break;
                    }
                }

                i = i + 1;
                if (list.length <= i) {
                    setTimeout(() => {
                        this.controller = undefined;
                        console.log('Playback finished');
                        alert('Playback finished');
                        callback?.call(null, false);
                        this.systemState.restore();
                    }, 2000);
                    return;
                }
                entry = list[i];
            } while (baseEntry[0] + 100 > entry[0]);

            let nextIn = Math.max(entry[0] - baseEntry[0], 0);
            setTimeout(func, nextIn);
        };

        console.log('Playback started');
        callback?.call(null, true);
        func();
    }

    public playbackDefault(callback?: (status: boolean) => void) {
        fetch('/replay.bin').then(response => {
            if (!response.ok) {
                console.error(`Failed to fetch playlist: ${response.status} ${response.statusText}`);
                alert(`Failed to fetch playlist: ${response.status} ${response.statusText}`);
            }

            return response.blob();
        }).then(value => {
            return value.arrayBuffer();
        }).then(value => {
            this.playback(value, callback);
        }, (reason: Error) => {
            console.error(`Failed to parse playlist: ${reason.name}:${reason.message}`);
            alert(`Failed to parse playlist: ${reason.name}:${reason.message}`);
        });
    }

    public record(callback?: (status: boolean) => void) {
        this.playlist = [];
        this.controller = new AbortController();
        if (this.blobUrl) {
            URL.revokeObjectURL(this.blobUrl);
            this.blobUrl = undefined;
        }
        this.systemState.stash();
        console.log('Playlist recording started');

        hostBridge.enabled = false;
        vatsim.stop();
        vatsim.enabled = this.systemState.network;
        setTimeout(() => {
            hostBridge.enabled = true;
        }, 5000);
        callback?.call(null, true);

        const finishFunc = () => {
            this.finishRecord();
            callback?.call(null, false);
            this.systemState.restore();
        };
        this.controller.signal.onabort = finishFunc;
        setTimeout(finishFunc, 600000);
    }

    private finishRecord() {
        const playlist = this.playlist;
        this.playlist = [];
        this.controller = undefined;
        console.log('Playlist recording finished');
        alert('Playlist recording finished');

        const blob = new Blob([ pack(playlist) ], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_self');
        this.blobUrl = url;
    }

    public onHostMessage(blob: Uint8Array) {
        if (!this.active) {
            return;
        }
        this.playlist.push([
            Date.now(),
            MessageType.Host,
            blob,
        ]);
    }

    public onNetworkMessage(data: LiveNetworkData | undefined) {
        if (!this.active) {
            return;
        }
        this.playlist.push([
            Date.now(),
            MessageType.Network,
            pack(data),
        ]);
    }

    public abort() {
        this.controller?.abort();
    }

    public get active() {
        return this.controller != null;
    }
}
export default Replay;
