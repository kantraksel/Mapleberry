import Event from "../Event";

export interface FlightPlan {
    flight_rules: string,
    aircraft: string,
    aircraft_faa: string,
    aircraft_short: string,
    departure: string,
    arrival: string,
    alternate: string,
    deptime: string,
    enroute_time: string,
    fuel_time: string,
    remarks: string,
    route: string,
    revision_id: number,
    assigned_transponder: string,

    cruise_tas: string,
    altitude: string,
}

export interface Pilot {
    cid: number,
    name: string,
    callsign: string,
    server: string,
    pilot_rating: number,
    military_rating: number,
    latitude: number,
    longitude: number,
    altitude: number,
    groundspeed: number,
    transponder: string,
    heading: number,
    qnh_i_hg: number,
    qnh_mb: number,
    flight_plan?: FlightPlan,
    logon_time: string,
    last_updated: string,
}

export interface Controller {
    cid: number,
    name: string,
    callsign: string,
    frequency: string,
    facility: number,
    rating: number,
    server: string,
    visual_range: number,
    text_atis?: string[],
    last_updated: string,
    logon_time: string,
}

export interface Atis {
    cid: number,
    name: string,
    callsign: string,
    frequency: string,
    facility: number,
    rating: number,
    server: string,
    visual_range: number,
    atis_code: string,
    text_atis: string[],
    last_updated: string,
    logon_time: string,
}

export interface Server {
    ident: string,
    hostname_or_ip: string,
    location: string,
    name: string,
    client_connections_allowed: boolean,
    is_sweatbox: boolean,
}

export interface Prefile {
    cid: number,
    name: string,
    callsign: string,
    flight_plan: FlightPlan,
    last_updated: string,
}

export interface Facility {
    id: number,
    short: string,
    long: string,
}

export interface Rating {
    id: number,
    short_name: string,
    long_name: string,
}

export interface RatingOld {
    id: number,
    short_name?: string,
    long_name?: string,
    short?: string,
    long?: string,
}

export interface LiveNetworkData {
    general: {
        version: number,
        update_timestamp: string,
        connected_clients: number,
        unique_users: number,
    },
    pilots: Pilot[],
    controllers: Controller[],
    atis: Atis[],
    servers: Server[],
    prefiles: Prefile[],
    facilities: Facility[],
    ratings: RatingOld[],
    pilot_ratings: Rating[],
    military_ratings: Rating[],
}

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

    static readonly defaultRefreshRate = 35;
    static readonly minimumRefreshRate = 15;

    public constructor() {
        this.dataRefreshTask = 0;
        this.lastUpdate = 0;
        this.currentStatus = NetworkStatus.Disabled;
        this.StatusUpdate = new Event();

        const value = options.get<number>('vatsim_refresh_rate', VATSIM.defaultRefreshRate);
        this.refreshInterval = Math.max(value, VATSIM.minimumRefreshRate);

        if (this.enabled) {
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
        const response = await fetch(`https://metar.vatsim.net/${airport}`, { cache: 'no-cache' });
        return await response.text();
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
    }

    public get enabled() {
        return options.get<boolean>('vatsim_enabled', true);
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
