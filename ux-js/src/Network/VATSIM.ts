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

interface Atis {
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

interface Server {
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

interface Facility {
    id: number,
    short: string,
    long: string,
}

interface Rating {
    id: number,
    short_name: string,
    long_name: string,
}

interface RatingOld {
    id: number,
    short: string,
    long: string,
}

// https://vatsim.dev/api/data-api/get-network-data/
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

interface NetPropsCache {
    facilities: Facility[],
    ratings: RatingOld[],
    pilot_ratings: Rating[],
    military_ratings: Rating[],
}

export interface NetworkStations {
    observers: Controller[],
    pilots: Pilot[],
    prefiles: Prefile[],
    controllers: Controller[],
    atis: Atis[],
}

type UpdateEvent = (data?: NetworkStations) => void;

class VATSIM {
    private networkData?: LiveNetworkData & NetworkStations;
    private dataRefreshTask: number;
    private propsCache?: NetPropsCache;

    public readonly Update: Event<UpdateEvent>;

    static readonly defaultRefreshRate = 35;
    static readonly minimumRefreshRate = 15;

    public constructor() {
        this.dataRefreshTask = 0;
        this.Update = new Event();

        if (this.enabled) {
            this.start();
        }
    }

    public start() {
        if (this.dataRefreshTask > 0) {
            return;
        }
        this.dataRefreshTask = this.fetchNetworkData();
    }

    public stop() {
        if (this.dataRefreshTask == 0) {
            return;
        }
        this.Update.invoke();

        clearTimeout(this.dataRefreshTask);
        this.dataRefreshTask = 0;
    }

    private async processNetworkData() {
        const data = await VATSIM.getObject<LiveNetworkData & Partial<NetworkStations>>('https://data.vatsim.net/v3/vatsim-data.json');
        
        // update cache
        this.propsCache = {
            facilities: data.facilities,
            ratings: data.ratings,
            pilot_ratings: data.pilot_ratings,
            military_ratings: data.military_ratings,
        };

        // separate observers from controllers
        const observerId = data.facilities.find(facility => facility.short == 'OBS')?.id ?? 0;
        const observers: Controller[] = [];
        const controllers: Controller[] = [];

        data.controllers.forEach(controller => {
            if (controller.facility === observerId) {
                observers.push(controller);
            } else {
                controllers.push(controller);
            }
        });
        data.controllers = controllers;
        data.observers = observers;

        this.networkData = data as Required<typeof data>;
        this.Update.invoke(data as NetworkStations);
    }

    private fetchNetworkData() {
        const fn = async () => {
            try {
                this.processNetworkData();
            } catch (e) {
                const err = e as Error;
                console.error(`VATSIM network fetch failed: ${err.message}`);
            }

            if (this.dataRefreshTask == 0) {
                return;
            }
            this.dataRefreshTask = setTimeout(fn, this.refreshRate * 1000);
        };
        return setTimeout(fn, 500);
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
        options.set('vatsim_refresh_rate', value);
    }

    public get refreshRate() {
        const value = options.get<number>('vatsim_refresh_rate', VATSIM.defaultRefreshRate);
        return value < VATSIM.minimumRefreshRate ? VATSIM.defaultRefreshRate : value;
    }

    public set enabled(value: boolean) {
        options.set('vatsim_enabled', value);
    }

    public get enabled() {
        return options.get<boolean>('vatsim_enabled', true);
    }

    public getNetworkData(): NetworkStations | undefined {
        return this.networkData;
    }

    public getPilotRatings() {
        return this.propsCache?.pilot_ratings ?? [];
    }

    public getMilitaryRatings() {
        return this.propsCache?.military_ratings ?? [];
    }

    public getControllerRatings() {
        return this.propsCache?.ratings ?? [];
    }

    public getFacilities() {
        return this.propsCache?.facilities ?? [];
    }
}

export default VATSIM;
