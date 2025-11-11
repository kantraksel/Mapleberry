import Event from "./../../Event";
import LiveNetworkData from "./Objects/LiveNetworkData";

export enum NetworkStatus {
    Disabled,
    Updating,
    UpToDate,
}

class VATSIM {
    private dataRefreshTask: number;
    private lastUpdate: number;
    private refreshInterval: number;
    private currentStatus: NetworkStatus;
    public StatusUpdate: Event<(status: NetworkStatus) => void>;
    private enabled_: boolean;

    static readonly defaultRefreshRate = 35;
    static readonly minimumRefreshRate = 15;

    public constructor() {
        this.dataRefreshTask = 0;
        this.lastUpdate = 0;
        this.currentStatus = NetworkStatus.Disabled;
        this.StatusUpdate = new Event();
        this.enabled_ = options.get<boolean>('vatsim_enabled', true);

        const value = options.get<number>('vatsim_refresh_rate', VATSIM.defaultRefreshRate);
        this.refreshInterval = Math.max(value, VATSIM.minimumRefreshRate);

        if (this.enabled_) {
            this.start();
        }
    }

    public start() {
        if (this.dataRefreshTask > 0) {
            return;
        }
        this.fetchNetworkData();
    }

    public stop() {
        if (this.dataRefreshTask == 0) {
            return;
        }
        network.updateState(undefined);

        clearInterval(this.dataRefreshTask);
        this.dataRefreshTask = 0;
        this.lastUpdate = 0;
        this.updateStatus(NetworkStatus.Disabled);
    }

    // https://vatsim.dev/api/data-api/get-network-data/
    private async processNetworkData() {
        const data = await VATSIM.getObject<LiveNetworkData>('https://data.vatsim.net/v3/vatsim-data.json');
        replay.onNetworkMessage(data);
        network.updateState(data);
    }

    private fetchNetworkData() {
        const fn = async () => {
            if ((Date.now() - this.lastUpdate) < (this.refreshInterval * 1000)) {
                return;
            }
            this.lastUpdate = Number.POSITIVE_INFINITY;
            this.updateStatus(NetworkStatus.Updating);

            try {
                await this.processNetworkData();
            } catch (e) {
                const err = e as Error;
                console.error(`VATSIM network fetch failed: ${err.message}`);
            }

            this.updateStatus(NetworkStatus.UpToDate);
            this.lastUpdate = Date.now();
        };
        this.dataRefreshTask = setInterval(fn, 500);
    }

    // https://vatsim.dev/api/metar-api/get-metar
    public async getMetar(airport: string) {
        const response = await fetch(`https://metar.vatsim.net/${airport}`, { cache: 'default' });
        return await response.text();
    }

    public openStats(cid: number) {
        window.open(`https://stats.vatsim.net/search_id.php?id=${cid}`, '_blank');
    }

    private static async getObject<Type>(url: string) {
        const response = await fetch(url, { cache: 'default' });
        return await response.json() as Type;
    }

    public set refreshRate(value: number) {
        value = Math.max(value, VATSIM.minimumRefreshRate);
        this.refreshInterval = value;
        options.set('vatsim_refresh_rate', value);
    }

    public get refreshRate() {
        return this.refreshInterval;
    }

    public set enabled(value: boolean) {
        options.set('vatsim_enabled', value);
        this.enabled_ = value;

        if (value) {
            vatsim.start();
        } else {
            vatsim.stop();
        }
    }

    public get enabled() {
        return this.enabled_;
    }

    public get status() {
        return this.currentStatus;
    }

    private updateStatus(status: NetworkStatus) {
        this.currentStatus = status;
        this.StatusUpdate.invoke(status);
    }
}

export default VATSIM;
