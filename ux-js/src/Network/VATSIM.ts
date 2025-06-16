import Event from "../Event";
import MapPlane from "../Map/MapPlane";

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

class VatsimPlane {
    plane: MapPlane;
    inMap: boolean;

    constructor() {
        this.plane = new MapPlane();
        this.inMap = false;
    }
}

type UpdateEvent = (networkData?: LiveNetworkData) => void;

class VATSIM {
    private networkData?: LiveNetworkData;
    private dataRefreshTask: number;
    private planes: Map<string, VatsimPlane>;
    private propsCache?: NetPropsCache;

    public readonly Update: Event<UpdateEvent>;

    static readonly defaultRefreshRate = 35;
    static readonly minimumRefreshRate = 15;

    public constructor() {
        this.planes = new Map();
        this.dataRefreshTask = 0;
        this.Update = new Event();

        radar.planeAdded.add((plane) => {
            const pilot = this.planes.get(plane.callsign);
            if (!pilot) {
                return;
            }

            this.loseContact(pilot);
            
        });
        radar.planeRemoved.add((plane) => {
            const pilot = this.planes.get(plane.callsign);
            if (!pilot) {
                return;
            }

            const params = plane.plane.getParams();
            if (params) {
                pilot.plane.setParams(params);
            }

            this.establishContact(pilot);
        });

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
        this.planes.forEach((value) => {
            this.loseContact(value);
        });
        this.planes.clear();
        this.Update.invoke();

        clearTimeout(this.dataRefreshTask);
        this.dataRefreshTask = 0;
    }

    private establishContact(pilot: VatsimPlane) {
        if (!pilot.inMap) {
            planeLayers.addFarPlane(pilot.plane);
            pilot.inMap = true;
        }
    }

    private loseContact(pilot: VatsimPlane) {
        if (pilot.inMap) {
            planeLayers.removeFarPlane(pilot.plane);
            pilot.inMap = false;
        }
    }

    private fetchNetworkData() {
        const fn = async () => {
            this.networkData = await VATSIM.getObject<LiveNetworkData>('https://data.vatsim.net/v3/vatsim-data.json');

            // collect present pilots, add and update planes
            const pilots = new Set<string>();
            this.networkData.pilots.forEach((pilot: Pilot) => {
                const callsign = pilot.callsign;
                pilots.add(callsign);

                let plane = this.planes.get(callsign);
                if (!plane) {
                    plane = new VatsimPlane();
                    this.planes.set(callsign, plane);

                    plane.plane.setCallsign(callsign);

                    if (!radar.isVisible(callsign)) {
                        this.establishContact(plane);
                    }
                }

                const params = {
                    longitude: pilot.longitude,
                    latitude: pilot.latitude,
                    heading: pilot.heading,
                    altitude: pilot.altitude,
                    groundAltitude: 0,
                    indicatedSpeed: 0,
                    groundSpeed: pilot.groundspeed,
                    verticalSpeed: 0,
                };
                plane.plane.setParams(params);
            });

            // delete absent pilots
            this.planes.forEach((pilot, callsign) => {
                if (!pilots.has(callsign)) {
                    this.loseContact(pilot);
                    this.planes.delete(callsign);
                }
            });

            // update cache
            this.propsCache = {
                facilities: this.networkData.facilities,
                ratings: this.networkData.ratings,
                pilot_ratings: this.networkData.pilot_ratings,
                military_ratings: this.networkData.military_ratings,
            };

            this.Update.invoke(this.networkData);

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

    public getNetworkData() {
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
