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
    atis_code?: string,
    text_atis?: string[],
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
    ratings: RatingOld[],
    pilot_ratings: Rating[],
    military_ratings: Rating[],
}
export default LiveNetworkData;
