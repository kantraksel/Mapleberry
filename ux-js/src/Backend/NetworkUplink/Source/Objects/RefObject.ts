class RefObject {
    refCount: number;

    constructor() {
        this.refCount = 1;
    }

    addRef() {
        this.refCount++;
    }

    expired() {
        return this.refCount <= 0;
    }
}
export default RefObject;
