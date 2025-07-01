import { fromLonLat } from 'ol/proj';
import polygonClipping from 'polygon-clipping';

interface Country {
    name: string,
    icao: string,
    fir_suffix: string,
}

interface Airport {
    icao: string,
    name: string,
    latitude: number,
    longitude: number,
    iata_lid: string,
    fir: string,
    is_pseudo: number,
}

interface FIR {
    icao: string,
    name: string,
    callsign_prefix: string,
    fir_boundary: string,
}

interface UIR {
    icao: string,
    name: string,
    firs: string[],
}

interface StationList {
    countries: Country[],
    airports: Airport[],
    firs: FIR[],
    uirs: UIR[],
}

function controlListToJson(data: string): StationList {
    const countries: Country[] = [];
    const airports: Airport[] = [];
    const firs: FIR[] = [];
    const uirs: UIR[] = [];

    function parseCountryEntry(parts: string[]) {
        countries.push({
            name: parts[0],
            icao: parts[1],
            fir_suffix: parts[2],
        });
    }

    function parseAirportEntry(parts: string[]) {
        airports.push({
            icao: parts[0],
            name: parts[1],
            latitude: parseFloat(parts[2]),
            longitude: parseFloat(parts[3]),
            iata_lid: parts[4],
            fir: parts[5],
            is_pseudo: parseInt(parts[6]),
        });
    }

    function parseFirEntry(parts: string[]) {
        firs.push({
            icao: parts[0],
            name: parts[1],
            callsign_prefix: parts[2],
            fir_boundary: parts[3],
        });
    }

    function parseUirEntry(parts: string[]) {
        uirs.push({
            icao: parts[0],
            name: parts[1],
            firs: parts[2].split(','),
        });
    }

    const lines = data.split('\r\n');
    let parser = (_parts: string[]) => {};

    lines.forEach((value) => {
        switch (value[0]) {
            case undefined:
            case ';':
                return;
            case '[':
                switch (value) {
                    case '[Countries]':
                        parser = parseCountryEntry;
                        break;
                    case '[Airports]':
                        parser = parseAirportEntry;
                        break;
                    case '[FIRs]':
                        parser = parseFirEntry;
                        break;
                    case '[UIRs]':
                        parser = parseUirEntry;
                        break;
                    default:
                        console.warn(`ControlStations: unknown section ${value}`);
                        parser = () => {};
                }
                break;
            default:
                parser(value.split('|').map(value => value.trim()));
        }
    });

    return { countries, airports, firs, uirs };
}

interface Boundaries {
    type: 'FeatureCollection',
    name: string,
    crs: {
        type: 'name',
        properties: {
            name: string,
        },
    },
    features: BoundaryFeature[],
}

interface BoundaryFeature {
    type: 'Feature',
    properties: {
        id: string,
        oceanic: string | number,
        label_lon: string | number,
        label_lat: string | number,
        region: string | null,
        division: string | null,
    },
    geometry: {
        type: 'MultiPolygon',
        coordinates: number[][][][],
    },
}

/*
Known coordinate layouts:
[[[250x[2xnumber]]]]
[ [[009x[2x number]]], [[8x[2x number]]] ] <- two separate polygons
[[[ 004x[2x number], 7x[3x number] ]]] <- first is polygon, second are holes in it
*/

function isArray(obj: unknown) {
    return typeof obj === 'object' && obj instanceof Array;
}

function validateBoundaries(data: Partial<Boundaries>) {
    if (data.type !== 'FeatureCollection') {
        throw new Error('Boundaries is not FeatureCollection');
    }

    if (typeof data.name !== 'string') {
        throw new Error('Boundaries: name is not a string');
    }

    const features = data.features;
    if (!isArray(features)) {
        throw new Error('Feature array is not an array');
    }

    features.forEach((obj, index) => {
        if (obj.type !== 'Feature') {
            throw new Error(`Feature ${index} is not Feature`);
        }

        const properties = obj.properties;
        if (typeof properties !== 'object' ||
            typeof properties.id !== 'string' ||
            (typeof properties.oceanic !== 'string' && typeof properties.oceanic !== 'number') ||
            (typeof properties.label_lon !== 'string' && typeof properties.label_lon !== 'number') ||
            (typeof properties.label_lat !== 'string' && typeof properties.label_lat !== 'number') ||
            (typeof properties.region !== 'string' && properties.region !== null) ||
            (typeof properties.division !== 'string' && properties.division !== null)
        ) {
            throw new Error(`Feature ${index}: properties field is invalid`);
        }

        const geometry = obj.geometry;
        if (typeof geometry !== 'object') {
            throw new Error(`Feature ${index}: geometry field is not an object`);
        }

        if (geometry.type !== 'MultiPolygon') {
            throw new Error(`Feature ${index}: Geometry is not MultiPolygon`);
        }

        const coords = geometry.coordinates;
        if (!isArray(coords)) {
            throw new Error(`Feature ${index}: Geometry coordinates field is invalid`);
        }

        coords.forEach(coords => {
            if (!isArray(coords)) {
                throw new Error(`Feature ${index}: Geometry coordinates field is invalid`);
            }

            coords.forEach(coords => {
                if (!isArray(coords)) {
                    throw new Error(`Feature ${index}: Geometry coordinates field is invalid`);
                }

                coords.forEach(coords => {
                    if (!isArray(coords)) {
                        throw new Error(`Feature ${index}: Geometry coordinates field is invalid`);
                    }
                });
            });
        });
    });
}

export interface FIR_ext {
    icao: string,
    name: string,
    region: string,
    division: string,

    stations: FIRStation_ext[],
    label_pos: number[],
    geometry: number[][][][],
}

export interface FIRStation_ext {
    prefix: string,
    name: string,
}

export interface UIR_ext {
    icao: string,
    name: string,
    firs: FIR_ext[],
    label_pos: number[],
    geometry: number[][][][],
}

export interface Airport_ext {
    icao: string,
    name: string,
    longitude: number,
    latitude: number,
    fir: FIR_ext | undefined,
    stations: AirportStation_ext[];
}

export interface AirportStation_ext {
    iata_lid: string,
    name: string,
}

function checkCountryCode(code: string) {
    if (code.length > 2) {
        console.warn(`Country code ${code} is too long. Immediate fix needed`);
    }
}

function checkFIR_Prefix(name: string) {
    const parts = name.split('_');
    if (parts.length > 2) {
        console.warn(`FIR callsign prefix ${name} is non-standard. Immediate fix needed`);
    }
}

function checkFIR_ICAO(name: string) {
    const parts = name.split('_');
    if (parts.length > 1) {
        console.warn(`FIR ICAO ${name} is non-standard. Immediate fix needed`);
    }
}

function checkUIR_ICAO(name: string) {
    const parts = name.split('_');
    if (parts.length > 2) {
        console.warn(`UIR ICAO ${name} is non-standard. Immediate fix needed`);
    }
}

function checkAirportICAO(icao: string) {
    const parts = icao.split('_');
    if (parts.length > 1 || icao.length > 4) {
        console.warn(`Airport ICAO ${icao} is non-standard. Immediate fix needed`);
    }
}

function checkAirportIATA_LID(iata_lid: string) {
    const parts = iata_lid.split('_');
    if (parts.length > 2) {
        console.warn(`Airport IATA/LID ${iata_lid} is non-standard. Immediate fix needed`);
    }
}

function addToObjectMap<Obj>(id: string, obj: Obj, objMap: Map<string, Obj | Map<string, Obj>>) {
    const parts = id.split('_');
    let map = objMap.get(parts[0]);
    if (parts.length > 1) {
        if (!map) {
            map = new Map<string, Obj>();
            objMap.set(parts[0], map);
        } else if (!(map instanceof Map)) {
            const rootObj = map;
            map = new Map<string, Obj>();
            objMap.set(parts[0], map);
            map.set('', rootObj);
        }
        const suffix = parts.slice(1).join('_');
        map.set(suffix, obj);
    } else if (map instanceof Map) {
        map.set('', obj);
    } else {
        objMap.set(parts[0], obj);
    }
}

function createPointFromSegments(points: number[][]) {
    const first = points[0];
    const second = points[1];
    const third = points[2];
    const fourth = points[3];

    const length_first = second[0] - first[0];
    const length_second = second[1] - first[1];
    const length_third = fourth[0] - third[0];
    const lenght_fourth = fourth[1] - third[1];
    const length_fith = first[1] - third[1];
    const length_sixth = third[0] - first[0];

    // Solution of F and G factors:
    // x1 + F(x2 - x1) = x3 + G(x4 - x3)
    // y1 + F(y2 - y1) = y3 + G(y4 - y3)
    const factor = (length_sixth * lenght_fourth + length_fith * length_third) / (length_first * lenght_fourth - length_second * length_third);
    const control_factor = (factor * length_second + length_fith) / lenght_fourth;

    if (factor > 1 || factor < 0 || control_factor > 1 || control_factor < 0) {
        return null;
    }

    const x = first[0] + factor * length_first;
    const y = first[1] + factor * length_second;
    return [ x, y ];
}

function findBoundingPoints(geometry: number[][][][]) {
    let north: number[];
    let east: number[];
    let south: number[];
    let west: number[];
    north = east = south = west = geometry[0][0][0];

    geometry.forEach(polygon => {
        const ring = polygon[0];
        ring.forEach(coords => {
            const lon = coords[0];
            const lat = coords[1];
            if (north[0] < lon) {
                north = coords;
            } else if (south[0] > lon) {
                south = coords;
            }

            if (east[1] < lat) {
                east = coords;
            } else if (west[1] > lat) {
                west = coords;
            }
        });
    });

    return [ north, east, south, west];
}

class ControlStations {
    readonly airports: Map<string, Airport_ext>;
    readonly airports_iata: Map<string, Airport_ext | Map<string, Airport_ext>>;
    readonly firs: Map<string, FIR_ext>;
    readonly firs_prefix: Map<string, FIR_ext | Map<string, FIR_ext>>;
    readonly uirs: Map<string, UIR_ext | Map<string, UIR_ext>>;
    private ready: boolean;

    constructor() {
        this.airports = new Map();
        this.airports_iata = new Map();
        this.firs = new Map();
        this.firs_prefix = new Map();
        this.uirs = new Map();
        this.ready = false;

        this.loadDefs();
    }

    private async getList() {
        const response = await fetch('/VATSpy.dat');
        const data = await response.text();
        return controlListToJson(data);
    }

    private async getBoundaries() {
        const response = await fetch('/Boundaries.geojson');
        const data = await response.json() as Boundaries;
        validateBoundaries(data);
        return data;
    }

    private async loadDefs() {
        this.ready = false;
        const list = await this.getList();
        const boundaries = await this.getBoundaries();

        const boundary_map = new Map<string, BoundaryFeature>();
        boundaries.features.forEach(value => {
            boundary_map.set(value.properties.id, value);
        });

        const countries = list.countries;
        const country_map = new Map<string, Country>();
        countries.forEach(country => {
            checkCountryCode(country.icao);
            country_map.set(country.icao, country);
        });

        const firs = this.firs;
        const firs_prefix = this.firs_prefix;
        list.firs.forEach(value => {
            checkFIR_ICAO(value.icao);
            checkFIR_Prefix(value.callsign_prefix);

            let callsign_prefix = value.callsign_prefix;
            if (callsign_prefix.length == 0) {
                callsign_prefix = value.icao;
            }

            const country = country_map.get(value.icao.slice(0, 2));
            let name = value.name;
            if (country && country.fir_suffix.length > 0) {
                name = `${name} ${country.fir_suffix}`;
            }

            let fir = firs.get(value.icao);
            if (!fir) {
                let boundary = boundary_map.get(value.fir_boundary);
                if (!boundary) {
                    // fixes invalid fir_boundary entries
                    boundary = boundary_map.get(value.icao);
                    if (!boundary) {
                        console.error(`Cannot find boundary for FIR ${value.icao}`);
                        return;
                    }
                }

                const props = boundary.properties;
                fir = {
                    icao: value.icao,
                    name,
                    region: props.region ?? '',
                    division: props.division ?? '',

                    stations: [],
                    label_pos: [
                        typeof props.label_lon === 'number' ? props.label_lon : parseFloat(props.label_lon),
                        typeof props.label_lat === 'number' ? props.label_lat : parseFloat(props.label_lat),
                    ],
                    geometry: boundary.geometry.coordinates,
                };
                firs.set(value.icao, fir);
            }

            fir.stations.push({
                prefix: callsign_prefix,
                name,
            });
            addToObjectMap<FIR_ext>(callsign_prefix, fir, firs_prefix);
        });

        const polyUnion = polygonClipping.union as (...geoms: polygonClipping.Geom[]) => polygonClipping.MultiPolygon
        const uirs = this.uirs;
        list.uirs.forEach(value => {
            checkUIR_ICAO(value.icao);

            const fir_list: FIR_ext[] = [];
            const fir_geometries: number[][][][][] = [];
            value.firs.forEach(name => {
                const fir = firs.get(name);
                if (!fir) {
                    console.error(`Cannot find FIR ${name} for UIR ${value.icao}`);
                    return;
                }

                fir_list.push(fir);
                fir_geometries.push(fir.geometry);
            });
            if (fir_list.length == 0) {
                console.error(`Cannot find any FIR for UIR ${value.icao}`);
                return;
            }

            let geometry = polyUnion(...fir_geometries as polygonClipping.Geom[]) as number[][][][];
            // prebake geometry
            geometry = geometry.map(coords => coords.map(coords => coords.map(coords => fromLonLat(coords))));

            let points = findBoundingPoints(geometry);
            points = [ points[0], points[2], points[1], points[3] ];
            let label_pos = createPointFromSegments(points);
            if (!label_pos) {
                console.warn(`Cannot create label point for UIR ${value.icao}`);
                label_pos = fromLonLat(fir_list[0].label_pos);
            }

            const uir = {
                icao: value.icao,
                name: value.name,
                firs: fir_list,
                label_pos,
                geometry,
            };
            addToObjectMap<UIR_ext>(uir.icao, uir, uirs);
        });

        // prebake geometry
        this.firs.forEach(fir => {
            fir.label_pos = fromLonLat(fir.label_pos);
            fir.geometry = fir.geometry.map(coords => coords.map(coords => coords.map(coords => fromLonLat(coords))));
        });

        const airports = this.airports;
        list.airports.forEach(value => {
            checkAirportICAO(value.icao);
            checkAirportIATA_LID(value.iata_lid);

            const fir = firs.get(value.fir);
            if (!fir) {
                console.warn(`Cannot find FIR ${value.fir} for airport ${value.icao}`);
            }

            let airport = airports.get(value.icao);
            if (!airport) {
                airport = {
                    icao: value.icao,
                    name: value.name,
                    longitude: value.longitude,
                    latitude: value.latitude,
                    fir,
                    stations: [],
                };
                airports.set(value.icao, airport);
            }

            if (value.iata_lid.length > 0) {
                airport.stations.push({
                    iata_lid: value.iata_lid,
                    name: value.name,
                });
            }
        });

        const airports_iata = this.airports_iata;
        const stations_iata = Array.from(airports.values()).filter(value => value.stations.length > 0);
        stations_iata.sort((a, b) => {
            return a.stations.length - b.stations.length;
        });
        stations_iata.forEach(airport => {
            airport.stations.forEach(station => {
                addToObjectMap<Airport_ext>(station.iata_lid, airport, airports_iata);
            });
        });
        this.ready = true;
    }

    public getFIR(callsign: string): FIR_ext | undefined {
        const id_parts = callsign.split('_');
        const id = id_parts[0];

        const obj = this.firs_prefix.get(id);
        if (!obj) {
            return this.firs.get(id);
        } else if (obj instanceof Map) {
            let fir = obj.get(id_parts[1] ?? '');
            if (fir) {
                return fir;
            }
            fir = obj.get('');
            if (fir) {
                return fir;
            }
            // fixes invalid callsign prefixes
            // detected in Minsk Control: main is UMMM, but partials start with UMMV
            return this.firs.get(id);
        }
        return obj;
    }

    public getUIR(callsign: string): UIR_ext | undefined {
        const id_parts = callsign.split('_');

        const obj = this.uirs.get(id_parts[0]);
        if (obj instanceof Map) {
            const uir = obj.get(id_parts[1] ?? '');
            if (uir) {
                return uir;
            }
            return obj.get('');
        }
        return obj;
    }

    public getAirport(callsign: string): Airport_ext | undefined {
        const id_parts = callsign.split('_');
        const id = id_parts[0];

        const airport = this.airports.get(id);
        if (airport) {
            return airport;
        }
        const obj = this.airports_iata.get(id);
        if (obj instanceof Map) {
            const airport = obj.get(id_parts[1] ?? '');
            if (airport) {
                return airport;
            }
            return obj.get('');
        }
        return obj;
    }

    public isReady() {
        return this.ready;
    }
}

export default ControlStations;
