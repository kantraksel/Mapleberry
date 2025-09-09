import { fromLonLat } from 'ol/proj';
import polygonClipping from 'polygon-clipping';
import polylabel from 'polylabel';
import DefinitionLoader, { BoundaryFeature, Country, TraconFeature } from './DefinitionLoader';
import Event from '../Event';

enum RegionType {
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

export interface FIRStation_ext {
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
    stations: AirportStation_ext[];
}

export interface AirportStation_ext {
    iata_lid: string,
    name: string,
}

export interface Tracon {
    prefix: string[],
    suffix: string,
    name: string,
    geometry: number[][][][],

    airport: Airport_ext | undefined,
}

type Region = FIR_ext | UIR_ext;

function checkCountryCode(code: string) {
    if (code.length > 2) {
        console.warn(`Country code ${code} is too long. Immediate fix needed`);
    }
}

function checkFIR_Prefix(name: string) {
    const parts = name.split(/[-_]/);
    if (parts.length > 2) {
        console.warn(`FIR callsign prefix ${name} is non-standard. Immediate fix needed`);
    }
}

function checkFIR_ICAO(name: string) {
    const parts = name.split(/[-_]/);
    if (parts.length > 2) {
        console.warn(`FIR ICAO ${name} is non-standard. Immediate fix needed`);
    }
}

function checkUIR_ICAO(name: string) {
    const parts = name.split(/[-_]/);
    if (parts.length > 2) {
        console.warn(`UIR ICAO ${name} is non-standard. Immediate fix needed`);
    }
}

function checkAirportICAO(icao: string) {
    const parts = icao.split(/[-_]/);
    if (parts.length > 1 || icao.length > 4) {
        console.warn(`Airport ICAO ${icao} is non-standard. Immediate fix needed`);
    }
}

function checkAirportIATA_LID(iata_lid: string) {
    const parts = iata_lid.split(/[-_]/);
    if (parts.length > 2) {
        console.warn(`Airport IATA/LID ${iata_lid} is non-standard. Immediate fix needed`);
    }
}

function checkTraconPrefix(prefix: string) {
    const parts = prefix.split(/[-_]/);
    if (parts.length > 2) {
        console.warn(`TRACON prefix ${prefix} is non-standard. Immediate fix needed`);
    }
}

function addToObjectMap<Obj>(id: string, obj: Obj, objMap: Map<string, Obj | Map<string, Obj>>, allowReplace?: true) {
    const parts = id.split(/[-_]/);
    let map = objMap.get(parts[0]);
    if (parts.length > 1) {
        if (!(map instanceof Map)) {
            const obj = map;
            map = new Map<string, Obj>();
            objMap.set(parts[0], map);
            if (obj) {
                map.set('', obj);
            }
        }
        const suffix = parts[1];
        if (!allowReplace && map.has(suffix)) {
            console.warn(`Duplicate identifier ${id} - object ignored`);
            return;
        }
        map.set(suffix, obj);
    } else if (map instanceof Map) {
        if (!allowReplace && map.has('')) {
            console.warn(`Duplicate identifier ${id} - object ignored`);
            return;
        }
        map.set('', obj);
    } else {
        if (!allowReplace && map) {
            console.warn(`Duplicate identifier ${id} - object ignored`);
            return;
        }
        objMap.set(parts[0], obj);
    }
}

function addToTraconMap(id: string, obj: Tracon, objMap: Map<string, Tracon>) {
    const parts = id.split(/[-_]/);
    const suffix = parts.pop();
    const partTwo = parts[1];
    
    let sid;
    if (partTwo) {
        sid = `${parts[0]}_${partTwo}_${suffix}`;
    } else {
        sid = `${parts[0]}_${suffix}`;
    }

    const obj2 = objMap.get(sid);
    if (obj2) {
        console.warn(`Duplicate identifier ${id} - object ignored`);
        return;
    }
    objMap.set(sid, obj);
}

function isCallsignEqual(one: string, other: string) {
    if (one.length !== other.length) {
        return false;
    }
    const parts = one.split(/[-_]/);
    const others = other.split(/[-_]/);
    if (parts.length !== others.length) {
        return false;
    }
    for (let i = 0; i < parts.length; ++i) {
        if (parts[i] !== others[i]) {
            return false;
        }
    }
    return true;
}

export function splitCallsign(callsign: string) {
    return callsign.split(/[-_]/).filter(value => value.length > 0);
}

class ControlStations {
    readonly airports: Map<string, Airport_ext | Map<string, Airport_ext>>;
    readonly regions: Map<string, Region | Map<string, Region>>;
    readonly tracons: Map<string, Tracon>;
    Ready: Event<() => void>;

    constructor() {
        this.airports = new Map();
        this.regions = new Map();
        this.tracons = new Map();
        this.Ready = new Event();

        this.loadDefs();
    }

    private async loadDefs() {
        const list = await DefinitionLoader.loadMainDefs();
        const boundaries = await DefinitionLoader.loadBoundaries();
        const tracons = await DefinitionLoader.loadTracons();

        const boundary_map = new Map<string, BoundaryFeature>();
        boundaries.features.forEach(value => {
            const id = value.properties.id;
            const boundary = boundary_map.get(id);
            if (boundary) {
                value.geometry.coordinates.forEach(polygon => {
                    boundary.geometry.coordinates.push(polygon);
                });
            } else {
                boundary_map.set(id, value);
            }
        });

        const countries = list.countries;
        const country_map = new Map<string, Country>();
        countries.forEach(country => {
            checkCountryCode(country.icao);
            country_map.set(country.icao, country);
        });

        const firs = new Map<string, FIR_ext>();
        const regions = this.regions;
        const fir_prefixes = new Map<string, Region>();

        list.firs.forEach(value => {
            checkFIR_ICAO(value.icao);
            checkFIR_Prefix(value.callsign_prefix);

            const country = country_map.get(value.icao.slice(0, 2));
            let name = value.name;
            if (country) {
                let suffix = country.fir_suffix;
                if (suffix.length == 0) {
                    suffix = 'Center';
                }
                name = `${name} ${suffix}`;
            } else {
                name = `${name} Center`;
            }

            let region = firs.get(value.icao);
            if (!region) {
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
                region = {
                    type: RegionType.FIR,
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

                firs.set(value.icao, region);
                addToObjectMap<Region>(value.icao, region, regions);
            }

            let callsign_prefix = value.callsign_prefix;
            region.stations.push({
                prefix: callsign_prefix,
                name,
            });

            if (callsign_prefix.length > 0 && !isCallsignEqual(callsign_prefix, value.icao)) {
                if (fir_prefixes.has(callsign_prefix)) {
                    console.warn(`Duplicate identifier ${callsign_prefix} - object ignored`);
                } else {
                    fir_prefixes.set(callsign_prefix, region);
                }
            }
        });
        fir_prefixes.forEach((value, key) => {
            addToObjectMap<Region>(key, value, regions, true);
        });
        fir_prefixes.clear();

        const polyUnion = polygonClipping.union as (...geoms: number[][][][][]) => polygonClipping.MultiPolygon;
        const polyDiff = polygonClipping.difference;
        const worldBorders = { south: [[ [-200, -58], [200, -58], [200, -100], [-200, -100,], [-200, -58] ]], north: [[ [-200, 75], [200, 75], [200, 100], [-200, 100,], [-200, 75] ]] };

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

            let geometry = polyUnion(...fir_geometries) as number[][][][];

            let labels = [];
            const labelGeometry = polyDiff(geometry as polygonClipping.Geom, worldBorders.north as polygonClipping.Geom, worldBorders.south as polygonClipping.Geom);
            if (labelGeometry.length == 0) {
                console.warn(`Cannot create label geometry for UIR ${value.icao}`);
                labels.push(fir_list[0].label_pos);
            } else {
                for (let i = 0; i < labelGeometry.length; ++i) {
                    const label_pos = polylabel(labelGeometry[i]) as number[];
                    labels.push(label_pos);
                }
            }

            // prebake geometry
            geometry = geometry.map(coords => coords.map(coords => coords.map(coords => fromLonLat(coords))));

            const uir = {
                type: RegionType.UIR,
                icao: value.icao,
                name: value.name,
                firs: fir_list,
                labels_pos: labels,
                geometry,
            };
            addToObjectMap<Region>(uir.icao, uir, regions);
        });

        // prebake geometry
        firs.forEach(fir => {
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

            let airport;
            const obj = airports.get(value.icao);
            if (obj instanceof Map) {
                airport = obj.get('');
            } else {
                airport = obj;
            }

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
                addToObjectMap<Airport_ext>(value.iata_lid, airport, airports);
            }
        });

        tracons.features.forEach(value => {
            if (value.type == 'Feature') {
                this.parseTraconFeature(value);
            } else if (value.type == 'FeatureCollection') {
                value.features.forEach(value => {
                    this.parseTraconFeature(value);
                });
            }
        });

        this.Ready.invoke();
    }

    private parseTraconFeature(value: TraconFeature) {
        const prefixes = value.properties.prefix;
        if (prefixes instanceof Array) {
            const tracon = this.createTraconObject(value);
            prefixes.forEach(prefix => {
                checkTraconPrefix(prefix);
                tracon.prefix.push(prefix);
                addToTraconMap(`${prefix}_${tracon.suffix}`, tracon, this.tracons);

                if (!tracon.airport) {
                    tracon.airport = this.findAirport(value, prefix);
                }
            });
        } else {
            checkTraconPrefix(prefixes);
            const tracon = this.createTraconObject(value);
            tracon.airport = this.findAirport(value, prefixes);
            tracon.prefix.push(prefixes);
            addToTraconMap(`${prefixes}_${tracon.suffix}`, tracon, this.tracons);
        }
    }

    private findAirport(feature: TraconFeature, prefix: string) {
        let airport = this.getAirport(prefix);
        if (!airport) {
            const props = feature.properties;
            airport = this.getAirport(props.id);
            if (!airport) {
                const region = this.getRegion(prefix);
                if (region) {
                    console.info(`Found region ${region.icao} for TRACON ${props.id}/${prefix}/${props.name}`);
                } else {
                    console.warn(`Cannot find airport for TRACON ${props.id}/${prefix}/${props.name}`);
                }
            } else {
                const newPrefix = airport.stations[0]?.iata_lid ?? airport.icao;
                console.info(`Replacing invalid prefix for TRACON ${props.id}/${prefix}/${props.name}: ${prefix} -> ${newPrefix}`);
                prefix = newPrefix;
            }
        }
        return airport;
    }

    private createTraconObject(feature: TraconFeature): Tracon {
        let coordinates;
        const geometry = feature.geometry;
        if (geometry.type == 'Polygon') {
            coordinates = [ geometry.coordinates ];
        } else {
            coordinates = geometry.coordinates;
        }

        // prebake geometry
        coordinates = coordinates.map(coords => coords.map(coords => coords.map(coords => fromLonLat(coords))));

        const props = feature.properties;
        return {
            name: props.name,
            prefix: [],
            suffix: props.suffix ?? 'APP',
            geometry: coordinates,
            airport: undefined,
        };
    }

    public getRegion(callsign: string): FIR_ext | UIR_ext | undefined {
        const id_parts = splitCallsign(callsign);

        const obj = this.regions.get(id_parts[0]);
        if (!obj) {
            return obj;
        } else if (obj instanceof Map) {
            const id_part = id_parts[1];
            if (id_part) {
                const region = obj.get(id_part);
                if (region) {
                    return region;
                }
            }
            return obj.get('');
        }
        return obj;
    }

    public getAirport(callsign: string): Airport_ext | undefined {
        const id_parts = splitCallsign(callsign);

        const obj = this.airports.get(id_parts[0]);
        if (obj instanceof Map) {
            const id_part = id_parts[1];
            if (id_part) {
                const airport = obj.get(id_part);
                if (airport) {
                    return airport;
                }
            }
            return obj.get('');
        }
        return obj;
    }

    public getAirportByIcao(icao: string): Airport_ext | undefined {
        const obj = this.airports.get(icao);
        if (obj instanceof Map) {
            return obj.get('');
        }
        return obj;
    }

    public getTracon(callsign: string) : [ string, Tracon | undefined ] {
        const id_parts = splitCallsign(callsign);
        const suffix = id_parts.pop();
        const partTwo = id_parts[1];
        
        let sid;
        if (partTwo) {
            sid = `${id_parts[0]}_${partTwo}_${suffix}`;
        } else {
            sid = `${id_parts[0]}_${suffix}`;
        }

        const obj = this.tracons.get(sid);
        if (obj) {
            return [sid, obj];
        }
        sid = `${id_parts[0]}_${suffix}`;
        return [sid, this.tracons.get(sid)];
    }

    public isReady() {
        return this.airports.size > 0;
    }
}

export default ControlStations;
