type WebViewCallback = (e: { data: unknown }) => void;

interface WebView {
    addEventListener: (type: 'message', listener: WebViewCallback) => void,
    postMessage: (message: unknown) => void,
    removeEventListener: (type: 'message', listener: WebViewCallback) => void,
}

declare global {
    var chrome: { webview: WebView };
}

interface Message {
    _msg_id?: string;
}

class HostBridge {
    private callbacks: Map<string, (data: object) => void>;
    private playList?: PlaybackMessage[];
    private playbackController?: AbortController;

    public constructor() {
        this.callbacks = new Map();

        if (!window.chrome || !window.chrome.webview) {
            console.warn('Running in usual browser - cannot register webview handler');
            return;
        }

        window.chrome.webview.addEventListener('message', e => {
            this.onMessage(e);
        });
    }

    public send(id: string, obj: object) {
        if (!window.chrome || !window.chrome.webview) {
            console.warn(`Tried to send message ${id} in usual browser`);
            return;
        }

        window.chrome.webview.postMessage({ ...obj, _msg_id: id });
    }

    private onMessage(e: { data: unknown }) {
        if (typeof e !== 'object' || typeof e.data !== 'object')
            return;

        const msg = e.data as Message;
        if (typeof msg._msg_id !== 'string')
            return;

        const callback = this.callbacks.get(msg._msg_id);
        if (callback)
            callback(msg);
        else
            console.warn(`Message ${msg._msg_id} has been discarded`);

        if (this.playList) {
            this.playList.push({ timestamp: Date.now(), object: e.data });
        }
    }

    public registerHandler(id: string, callback: (data: object) => void) {
        this.callbacks.set(id, callback);
    }

    public playback(list: PlaybackMessage[], callback?: (status: boolean) => void) {
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
