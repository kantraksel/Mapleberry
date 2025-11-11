export enum RegionType {
    FIR,
    UIR,
}

interface BaseRegion {
    type: RegionType;
}

export interface FIR_ext extends BaseRegion {
    icao: string,
    name: string,
    region: string,
    division: string,

    stations: FIRStation_ext[],
    label_pos: number[],
    geometry: number[][][][],
}

interface FIRStation_ext {
    prefix: string,
    name: string,
}

export interface UIR_ext extends BaseRegion {
    icao: string,
    name: string,
    firs: FIR_ext[],
    labels_pos: number[][],
    geometry: number[][][][],
}

export interface Airport_ext {
    icao: string,
    name: string,
    longitude: number,
    latitude: number,
    fir: FIR_ext | undefined,
    stations: AirportStation[];
}

interface AirportStation {
    iata_lid: string,
    name: string,
}
