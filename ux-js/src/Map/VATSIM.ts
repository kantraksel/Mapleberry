import MapPlane from "./MapPlane";

interface FlightPlan {
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
}

interface Pilot {
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
    flight_plan: FlightPlan,
    logon_time: string,
    last_updated: string,
}

interface Controller {
    cid: number,
    name: string,
    callsign: string,
    frequency: string,
    facility: number,
    rating: number,
    server: string,
    visual_range: number,
    text_atis: string[],
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

interface Prefile {
    cid: number,
    name: string,
    callsign: string,
    flight_plan: FlightPlan,
    last_updated: string,
}

interface Facility {
    id: number,
    short: string,
    long_name: string,
}

interface Rating {
    id: number,
    short_name: string,
    long_name: string,
}

// https://vatsim.dev/api/data-api/get-network-data/
interface LiveNetworkData {
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
    ratings: Rating[],
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

class VATSIM {
    private networkData?: LiveNetworkData;
    private dataRefreshTask: number;
    private planes: Map<string, VatsimPlane>;

    static readonly defaultRefreshRate = 35;

    public constructor() {
        this.planes = new Map();
        this.dataRefreshTask = 0;

        radar.planeAdded.add((plane) => {
            const pilot = this.planes.get(plane.callsign);
            if (!pilot) {
                return;
            }

            this.removePlane(pilot);
            
        });
        radar.planeRemoved.add((plane) => {
            const pilot = this.planes.get(plane.callsign);
            if (!pilot) {
                return;
            }

            this.addPlane(pilot);
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
            this.removePlane(value);
        });
        this.planes.clear();

        clearTimeout(this.dataRefreshTask);
        this.dataRefreshTask = 0;
    }

    private addPlane(pilot: VatsimPlane) {
        if (!pilot.inMap) {
            planeLayers.addFarPlane(pilot.plane);
            pilot.inMap = true;
        }
    }

    private removePlane(pilot: VatsimPlane) {
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
                        this.addPlane(plane);
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
                    this.removePlane(pilot);
                    this.planes.delete(callsign);
                }
            });

            if (this.dataRefreshTask == 0) {
                return;
            }
            this.dataRefreshTask = setTimeout(fn, this.refreshRate * 1000);
        };
        return setTimeout(fn, 3000);
    }

    // https://vatsim.dev/api/metar-api/get-metar
    public async getMetar(airport: string) {
        const response = await fetch(`https://metar.vatsim.net/${airport}`, { cache: 'no-cache' });
        return await response.text();
    }

    private static async getObject<Type>(url: string) {
        const response = await fetch(url, { cache: 'no-cache' });
        return await response.json() as Type;
    }

    public set refreshRate(value: number) {
        if (value < 15) {
            value = VATSIM.defaultRefreshRate;
        }
        options.set('vatsim_refresh_rate', value);
    }

    public get refreshRate() {
        return options.get<number>('vatsim_refresh_rate', VATSIM.defaultRefreshRate);
    }

    public set enabled(value: boolean) {
        options.set('vatsim_enabled', value);
    }

    public get enabled() {
        return options.get<boolean>('vatsim_enabled', true);
    }
}

export default VATSIM;
