import { DBSchema, IDBPDatabase, openDB } from "idb";
import { StationList } from "./NetworkUplink/Source/Parsers/MainParser";
import { Boundaries } from "./NetworkUplink/Source/Parsers/BoundaryParser";
import { Tracon } from "./NetworkUplink/Source/Parsers/TraconParser";

interface AppDB extends DBSchema {
    stations: {
        key: string,
        value: MetaObject | MainDefsObject | BoundaryDefsObject | TraconDefsObject,
    },
}

interface MetaObject {
    type: 'meta',
    mainDefsUpdate: number,
    boundaryDefsUpdate: number,
    traconDefsUpdate: number,
    lastUpdateCheck: number,
}

interface MainDefsObject {
    type: 'vatspy-main',
    data: StationList,
}

interface BoundaryDefsObject {
    type: 'vatspy-boundary',
    data: Boundaries,
}

interface TraconDefsObject {
    type: 'simaware-tracon',
    data: Tracon,
}

class Database {
    private db?: IDBPDatabase<AppDB>;
    private initTask: Promise<void> | undefined;

    constructor() {
        this.open();
    }

    async open() {
        this.initTask = this.openInternal();
        await this.initTask;
        this.initTask = undefined;
    }

    async openInternal() {
        this.db = await openDB<AppDB>('app', 1, {
            upgrade: (database, _oldVersion, newVersion) => {
                if (newVersion ?? 0 <= 1) {
                    database.createObjectStore('stations', { keyPath: 'type' });
                }
            },
            blocked: () => {
                alert('Please close all other tabs with this site open!');
            },
            blocking: () => {
                this.db?.close();
                prompt('A new version of this page is ready. Please reload/close this tab!');
            },
        });

        const store = this.db.transaction('stations', 'readwrite').objectStore('stations');
        let meta = await store.get('meta') as MetaObject | undefined;
        if (!meta) {
            meta = {
                type: 'meta' as const,
                mainDefsUpdate: 0,
                boundaryDefsUpdate: 0,
                traconDefsUpdate: 0,
                lastUpdateCheck: 0,
            };
            await store.put(meta);
        }
    }

    private async waitForDb() {
        if (this.db) {
            return;
        }
        try {
            await this.initTask;
        } catch {
            throw new Error('Database not initialized');
        }
    }

    async updateMainDefs(data: StationList, updateTimestamp: number) {
        await this.waitForDb();

        const store = this.db!.transaction('stations', 'readwrite').objectStore('stations');
        let meta = await store.get('meta') as MetaObject | undefined;
        if (!meta) {
            throw new Error('Definition meta is undefined');
        }
        meta.mainDefsUpdate = updateTimestamp;

        const obj = {
            type: 'vatspy-main' as const,
            data,
        };
        await store.put(obj);
        await store.put(meta);
    }

    async updateBoundaryDefs(data: Boundaries, updateTimestamp: number) {
        await this.waitForDb();

        const store = this.db!.transaction('stations', 'readwrite').objectStore('stations');
        let meta = await store.get('meta') as MetaObject | undefined;
        if (!meta) {
            throw new Error('Definition meta is undefined');
        }
        meta.boundaryDefsUpdate = updateTimestamp;

        const obj = {
            type: 'vatspy-boundary' as const,
            data,
        };
        await store.put(obj);
        await store.put(meta);
    }

    async updateTraconDefs(data: Tracon, updateTimestamp: number) {
        await this.waitForDb();

        const store = this.db!.transaction('stations', 'readwrite').objectStore('stations');
        let meta = await store.get('meta') as MetaObject | undefined;
        if (!meta) {
            throw new Error('Definition meta is undefined');
        }
        meta.traconDefsUpdate = updateTimestamp;

        const obj = {
            type: 'simaware-tracon' as const,
            data,
        };
        await store.put(obj);
        await store.put(meta);
    }

    async getDefinitionMeta() {
        await this.waitForDb();
        const meta = await this.db!.get('stations', 'meta') as MetaObject | undefined;
        if (!meta) {
            throw new Error('Definition meta is undefined');
        }
        return meta;
    }

    async updateLastUpdateCheck(timestamp: number) {
        await this.waitForDb();
        const store = this.db!.transaction('stations', 'readwrite').objectStore('stations');
        const meta = await store.get('meta') as MetaObject | undefined;
        if (!meta) {
            throw new Error('Definition meta is undefined');
        }
        meta.lastUpdateCheck = timestamp;
        store.put(meta);
    }

    async getDefinitions() {
        await this.waitForDb();

        const store = this.db!.transaction('stations').objectStore('stations');
        const main = await store.get('vatspy-main') as MainDefsObject | undefined;
        const boundary = await store.get('vatspy-boundary') as BoundaryDefsObject | undefined;
        const tracons = await store.get('simaware-tracon') as TraconDefsObject | undefined;
        return { main: main?.data, boundaries: boundary?.data, tracons: tracons?.data };
    }
}
export default Database;
