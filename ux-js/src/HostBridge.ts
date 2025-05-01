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
    }

    public registerHandler(id: string, callback: (data: object) => void) {
        this.callbacks.set(id, callback);
    }
}

export default HostBridge;
