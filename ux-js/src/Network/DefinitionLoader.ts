export interface Country {
    name: string,
    icao: string,
    fir_suffix: string,
}

export interface Airport {
    icao: string,
    name: string,
    latitude: number,
    longitude: number,
    iata_lid: string,
    fir: string,
    is_pseudo: number,
}

export interface FIR {
    icao: string,
    name: string,
    callsign_prefix: string,
    fir_boundary: string,
}

export interface UIR {
    icao: string,
    name: string,
    firs: string[],
}

export interface StationList {
    countries: Country[],
    airports: Airport[],
    firs: FIR[],
    uirs: UIR[],
}

function parseMainDefs(data: string): StationList {
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

export interface Boundaries {
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

export interface BoundaryFeature {
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

class DefinitionLoader {
    public static async loadMainDefs() {
        const response = await fetch('/VATSpy.dat');
        const data = await response.text();
        return parseMainDefs(data);
    }

    public static async loadBoundaries() {
        const response = await fetch('/Boundaries.geojson');
        const data = await response.json() as Boundaries;
        validateBoundaries(data);
        return data;
    }
}

export default DefinitionLoader;
