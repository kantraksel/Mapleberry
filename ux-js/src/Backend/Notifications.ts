import Event from "./Event";

export enum Severity {
    Info,
    Success,
    Warning,
    Error,
}

interface Message {
    id: number,
    severity: Severity,
    text: string,
    onClose?: () => void,
    answers?: string[],
    onAnswer?: (idx: number) => void;
}

class Notifications {
    private messages: Message[];
    private nextId: number;
    public readonly Update: Event<() => void>;

    constructor() {
        this.messages = [];
        this.nextId = 1;
        this.Update = new Event();
    }

    notify(text: string, severity?: Severity, onClose?: () => void) {
        const id = this.nextId++;
        this.messages.push({
            id,
            severity: severity ?? Severity.Info,
            text,
            onClose,
        });
        this.Update.invoke();
        return id;
    }

    ask(text: string, answers: string[], onAnswer: (idx: number) => void, severity?: Severity) {
        const id = this.nextId++;
        this.messages.push({
            id,
            severity: severity ?? Severity.Info,
            text,
            answers,
            onAnswer,
        });
        this.Update.invoke();
        return id;
    }

    pop(id: number) {
        this.messages = this.messages.filter(msg => msg.id !== id);
        this.Update.invoke();
    }

    getMessages() {
        return this.messages;
    }
}
export default Notifications;
