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
    private initTasks: { resolve: (value: unknown) => void, reject: (error: unknown) => void }[];

    constructor() {
        this.initTasks = [];
        this.open();
    }

    async open() {
        this.db = await openDB<AppDB>('app', 1, {
            async upgrade(database, oldVersion, newVersion, transaction, event) {
                database.createObjectStore('stations', { keyPath: 'type' });
            },
            blocked(currentVersion, blockedVersion, event) {
                
            },
            blocking(currentVersion, blockedVersion, event) {
                
            },
            terminated() {
                
            },
        });

        this.initTasks.forEach(value => {
            value.resolve(null);
        });
        this.initTasks = [];
    }

    async updateMainDefs(data: StationList, updateTimestamp: number) {
        if (!this.db) {
            return;
        }
        const store = this.db.transaction('stations', 'readwrite').objectStore('stations');
        let meta = await store.get('meta') as MetaObject | undefined;
        if (!meta) {
            meta = {
                type: 'meta' as const,
                mainDefsUpdate: 0,
                boundaryDefsUpdate: 0,
                traconDefsUpdate: 0,
            };
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
        if (!this.db) {
            return;
        }
        const store = this.db.transaction('stations', 'readwrite').objectStore('stations');
        let meta = await store.get('meta') as MetaObject | undefined;
        if (!meta) {
            meta = {
                type: 'meta' as const,
                mainDefsUpdate: 0,
                boundaryDefsUpdate: 0,
                traconDefsUpdate: 0,
            };
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
        if (!this.db) {
            return;
        }
        const store = this.db.transaction('stations', 'readwrite').objectStore('stations');
        let meta = await store.get('meta') as MetaObject | undefined;
        if (!meta) {
            meta = {
                type: 'meta' as const,
                mainDefsUpdate: 0,
                boundaryDefsUpdate: 0,
                traconDefsUpdate: 0,
            };
        }
        meta.traconDefsUpdate = updateTimestamp;

        const obj = {
            type: 'simaware-tracon' as const,
            data,
        };
        await store.put(obj);
        await store.put(meta);
    }

    async getUpdateMeta() {
        if (!this.db) {
            return;
        }
        return await this.db.get('stations', 'meta') as MetaObject | undefined;
    }

    async getDefinitions(): Promise<[StationList | undefined, Boundaries | undefined, Tracon | undefined] | undefined> {
        if (!this.db) {
            await new Promise((resolve, reject) => this.initTasks.push({resolve, reject}));
        }
        const store = this.db!.transaction('stations').objectStore('stations');
        const main = await store.get('vatspy-main') as MainDefsObject | undefined;
        const boundary = await store.get('vatspy-boundary') as BoundaryDefsObject | undefined;
        const tracons = await store.get('simaware-tracon') as TraconDefsObject | undefined;
        return [main?.data, boundary?.data, tracons?.data];
    }
}
export default Database;
