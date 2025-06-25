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
                parser(value.split('|'));
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

interface FIR_ext {
    icao: string,
    name: string,
    region: string,
    division: string,

    callsign_prefix: string,
    label_lon: number,
    label_lat: number,
    geometry: number[][][][],
}

interface UIR_ext {
    icao: string,
    name: string,
    firs: FIR_ext[],
}

export interface Airport_ext {
    icao: string,
    name: string,
    longitude: number,
    latitude: number,
    fir: FIR_ext,
}

class ControlStations {
    readonly airports: Map<string, Airport_ext>;
    readonly airports_iata: Map<string, Airport_ext>;
    readonly firs: Map<string, FIR_ext>;
    readonly uirs: Map<string, UIR_ext>;

    constructor() {
        this.airports = new Map();
        this.airports_iata = new Map();
        this.firs = new Map();
        this.uirs = new Map();

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
        const list = await this.getList();
        const boundaries = await this.getBoundaries();

        const boundary_map = new Map<string, BoundaryFeature>();
        boundaries.features.forEach(value => {
            boundary_map.set(value.properties.id, value);
        });

        const countries = list.countries;

        const firs = this.firs;
        list.firs.forEach(value => {
            const boundary = boundary_map.get(value.fir_boundary);
            if (!boundary) {
                console.error(`Cannot find boundary for FIR ${value.icao}`);
                return;
            }

            const country = countries.find(country => (value.icao.startsWith(country.icao)));
            let name = value.name;
            if (country) {
                name = `${name} ${country.fir_suffix}`;
            }

            const props = boundary.properties;
            firs.set(value.icao, {
                icao: value.icao,
                name,
                region: props.region ?? '',
                division: props.division ?? '',

                callsign_prefix: value.callsign_prefix,
                label_lon: typeof props.label_lon === 'number' ? props.label_lon : parseFloat(props.label_lon),
                label_lat: typeof props.label_lat === 'number' ? props.label_lat : parseFloat(props.label_lat),
                geometry: boundary.geometry.coordinates,
            });
        });

        const uirs = this.uirs;
        list.uirs.forEach(value => {
            const fir_list: FIR_ext[] = [];
            value.firs.forEach(name => {
                const fir = firs.get(name);
                if (!fir) {
                    console.error(`Cannot find FIR ${name} for UIR ${value.icao}`);
                    return;
                }

                fir_list.push(fir);
            });

            uirs.set(value.icao, {
                icao: value.icao,
                name: value.name,
                firs: fir_list,
            });
        });

        const airports = this.airports;
        const airports_iata = this.airports_iata;
        list.airports.forEach(value => {
            const fir = firs.get(value.fir);
            if (!fir) {
                console.error(`Cannot find FIR ${value.fir} for ${value.icao}`);
                return;
            }

            const airport = {
                icao: value.icao,
                name: value.name,
                longitude: value.longitude,
                latitude: value.latitude,
                fir,
            };
            airports.set(value.icao, airport);

            if (value.iata_lid.length > 0) {
                airports_iata.set(value.iata_lid, airport);
            }
        });
    }
}

export default ControlStations;
