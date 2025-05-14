class Event<Func extends (...args: any[]) => void> {
    private callbacks: Func[];

    public constructor() {
        this.callbacks = [];
    }

    public add(callback: Func) {
        this.callbacks.push(callback);
    }

    public delete(callback: Func) {
        this.callbacks = this.callbacks.filter(item => item !== callback);
    }

    public invoke(...value: Parameters<Func>) {
        this.callbacks.forEach((callback) => {
            callback(value);
        });
    }
}

export default Event;
