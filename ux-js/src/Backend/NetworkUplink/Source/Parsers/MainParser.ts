interface Airport {
    icao: string,
    name: string,
    latitude: number,
    longitude: number,
    iata_lid: string,
    fir: string,
    is_pseudo: number,
}

export interface Country {
    name: string,
    icao: string,
    fir_suffix: string,
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

export interface StationList {
    countries: Country[],
    airports: Airport[],
    firs: FIR[],
    uirs: UIR[],
}

export function parseMainDefs(data: string): StationList {
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
