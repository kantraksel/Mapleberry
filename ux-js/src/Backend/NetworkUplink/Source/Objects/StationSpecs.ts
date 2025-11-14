interface BaseStation {
    icao: string,
    name: string,
}

export enum InfoRegion {
    FIR,
    UIR,
}

interface BaseInfoRegion extends BaseStation {
    type: InfoRegion;
    geometry: number[][][][],
}

export interface FirSpec extends BaseInfoRegion {
    region: string,
    division: string,

    callsigns: RegionCallsigns[],
    label_pos: number[],
}

interface RegionCallsigns {
    prefix: string,
    name: string,
}

export interface UirSpec extends BaseInfoRegion {
    firs: FirSpec[],
    labels_pos: number[][],
}

export type InfoRegionSpec = FirSpec | UirSpec;

export interface AirportSpec extends BaseStation {
    longitude: number,
    latitude: number,
    fir: FirSpec | undefined,
    aliases: AirportLid[];
}

interface AirportLid {
    iata_lid: string,
    name: string,
}

export interface TraconSpec {
    prefix: string[],
    suffix: string,
    name: string,
    geometry: number[][][][],

    airport: AirportSpec | undefined,
}
