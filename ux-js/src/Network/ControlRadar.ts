import { FeatureLike } from 'ol/Feature';
import MapArea, { StationDesc } from '../Map/MapArea';
import MapField from '../Map/MapField';
import { Airport_ext } from './ControlStations';
import { Atis, Controller, NetworkState } from './NetworkWorld';
import Event from '../Event';

export class VatsimArea {
    icao: string;
    area: MapArea;
    controllers: Controller[];
    station: StationDesc;

    constructor(desc: StationDesc) {
        this.area = new MapArea(desc);
        this.controllers = [];
        this.station = desc;
        this.icao = desc.icao;

        this.area.netState = this;
    }
}

export class VatsimField {
    icao: string;
    field: MapField;
    controllers: Controller[];
    atis: Atis[];
    station: Airport_ext;
    isOutlined: boolean;

    constructor(station: Airport_ext) {
        this.field = new MapField(station);
        this.controllers = [];
        this.atis = [];
        this.station = station;
        this.icao = station.icao;
        this.isOutlined = false;

        this.field.netState = this;
    }

    setFill() {
        this.field.setFilled();
        this.isOutlined = false;
    }

    setOutline() {
        this.field.setOutlined();
        this.isOutlined = true;
    }
}

export enum BroadcastType {
    Control,
    ATIS,
}

export type VatsimControl = VatsimArea | VatsimField;
export type ControllerEx = Controller & { station?: VatsimControl, type?: BroadcastType };
export type AtisEx = Atis & { station?: VatsimControl, type?: BroadcastType };

class ControlRadar {
    private fields: Map<string, VatsimField>;
    private areas: Map<string, VatsimArea>;
    private airportCache: Map<string, VatsimField>;
    private regionCache: Map<string, VatsimArea>;
    private waitTimer: number;
    public readonly update: Event<() => void>;

    constructor() {
        this.fields = new Map();
        this.areas = new Map();
        this.airportCache = new Map();
        this.regionCache = new Map();
        this.waitTimer = 0;
        this.update = new Event();

        network.Update.add(networkData => {
            if (controlStations.isReady()) {
                this.onRefresh(networkData);
                return;
            }
            if (this.waitTimer > 0) {
                return;
            }

            this.waitTimer = setInterval(() => {
                if (controlStations.isReady()) {
                    clearInterval(this.waitTimer);
                    this.waitTimer = 0;

                    this.onRefresh(network.getState());
                }
            }, 1000);
        });
    }

    public onSelectStation(e: FeatureLike) {
        const obj = MapArea.getNetState(e);
        if (obj) {
            const controllers = obj.controllers;
            if (controllers.length > 1) {
                cards.showFacilityList(obj);
            } else {
                cards.showControllerCard(controllers[0]);
            }
            return true;
        }

        const obj2 = MapField.getNetState(e);
        if (obj2) {
            const controllers = obj2.controllers;
            const atis = obj2.atis;
            if (controllers.length > 1 || atis.length > 1) {
                cards.showFacilityList(obj2);
            } else if (controllers.length > 0) {
                cards.showControllerCard(controllers[0]);
            } else {
                cards.showAtisCard(atis[0]);
            }
            return true;
        }

        return false;
    }

    private clear() {
        this.fields.forEach(field => {
            controlLayers.removeField(field.field);
        });
        this.fields.clear();
        this.areas.forEach(area => {
            controlLayers.removeArea(area.area);
        });
        this.areas.clear();
        this.airportCache.clear();
        this.regionCache.clear();

        this.update.invoke();
    }

    private onRefresh(networkData?: NetworkState) {
        if (!networkData) {
            this.clear();
            return;
        }
        const local_facilities = network.getLocalFacilities();

        const fields = this.fields;
        fields.forEach(field => {
            field.controllers = [];
            field.atis = [];
        });
        const old_fields = new Map(fields);
        const oldAirportCache = new Map(this.airportCache);

        const areas = this.areas;
        areas.forEach(area => {
            area.controllers = [];
        });
        const old_areas = new Map(areas);
        const oldRegionCache = new Map(this.regionCache);

        networkData.controllers.forEach((controller: ControllerEx) => {
            const callsign = controller.callsign;
            controller.type = BroadcastType.Control;
            controller.station = undefined;

            if (local_facilities.has(controller.facility)) {
                if (this.trySetAirportFromCache(controller, old_fields)) {
                    oldAirportCache.delete(callsign);
                    return;
                }
                const airport = controlStations.getAirport(callsign);
                if (airport) {
                    this.setFieldController(controller, old_fields, airport);
                } else {
                    if (this.trySetRegionFromCache(controller, old_areas)) {
                        oldRegionCache.delete(callsign);
                        return;
                    }
                    const region = controlStations.getRegion(callsign);
                    if (region) {
                        this.setAreaController(controller, old_areas, region);
                    } else {
                        console.warn(`Cannot find airport for ${callsign}`);
                    }
                }
            } else {
                if (this.trySetRegionFromCache(controller, old_areas)) {
                    oldRegionCache.delete(callsign);
                    return;
                }
                const region = controlStations.getRegion(callsign);
                if (region) {
                    this.setAreaController(controller, old_areas, region);
                } else {
                    if (this.trySetAirportFromCache(controller, old_fields)) {
                        oldAirportCache.delete(callsign);
                        return;
                    }
                    const airport = controlStations.getAirport(callsign);
                    if (airport) {
                        this.setFieldController(controller, old_fields, airport);
                    } else {
                        console.warn(`Cannot find FIR/UIR for ${callsign}`);
                    }
                }
            }
        });
        this.updateAtis(networkData.atis, old_fields, oldAirportCache);

        old_fields.forEach((field, icao) => {
            fields.delete(icao);
            controlLayers.removeField(field.field);
        });
        old_areas.forEach((area, icao) => {
            areas.delete(icao);
            controlLayers.removeArea(area.area);
        });
        oldAirportCache.forEach((_, callsign) => {
            this.airportCache.delete(callsign);
        });
        oldRegionCache.forEach((_, callsign) => {
            this.regionCache.delete(callsign);
        });

        this.update.invoke();
    }

    private setFieldController(controller: ControllerEx, old_fields: typeof this.fields, airport: Airport_ext) {
        const fields = this.fields;
        const id = airport.icao;

        let field = fields.get(id);
        if (field) {
            old_fields.delete(id);

            if (field.isOutlined) {
                field.setFill();
            }
        } else {
            field = new VatsimField(airport);
            fields.set(id, field);
            controlLayers.addField(field.field);
        }
        field.controllers.push(controller);
        controller.station = field;

        this.airportCache.set(controller.callsign, field);
    }

    private updateAtis(atis: AtisEx[], old_fields: typeof this.fields, oldAirportCache: typeof this.airportCache) {
        const fields = this.fields;

        atis.forEach(atis => {
            const callsign = atis.callsign;
            atis.type = BroadcastType.ATIS;

            let field = this.airportCache.get(callsign);
            if (field) {
                old_fields.delete(field.station.icao);
                field.atis.push(atis);
                atis.station = field;

                if (!field.isOutlined && field.controllers.length == 0) {
                    field.setOutline();
                }
                oldAirportCache.delete(callsign);
                return;
            }

            const airport = controlStations.getAirport(callsign);
            if (!airport) {
                console.warn(`Cannot find airport for ${callsign}`);
                atis.station = undefined;
                return;
            }
            const id = airport.icao;

            field = fields.get(id);
            if (field) {
                old_fields.delete(id);

                if (!field.isOutlined && field.controllers.length == 0) {
                    field.setOutline();
                }
            } else {
                field = new VatsimField(airport);
                fields.set(id, field);
                controlLayers.addField(field.field);

                field.setOutline();
            }
            field.atis.push(atis);
            atis.station = field;

            this.airportCache.set(callsign, field);
        });
    }

    private setAreaController(controller: ControllerEx, old_areas: typeof this.areas, area_desc: StationDesc) {
        const areas = this.areas;
        const id = area_desc.icao;

        let area = areas.get(id);
        if (area) {
            old_areas.delete(id);
        } else {
            area = new VatsimArea(area_desc);
            areas.set(id, area);
            controlLayers.addArea(area.area);
        }
        area.controllers.push(controller);
        controller.station = area;

        this.regionCache.set(controller.callsign, area);
    }

    private trySetAirportFromCache(controller: ControllerEx, old_fields: typeof this.fields) {
        const airport = this.airportCache.get(controller.callsign);
        if (airport) {
            old_fields.delete(airport.station.icao);
            airport.controllers.push(controller);
            controller.station = airport;

            if (airport.isOutlined) {
                airport.setFill();
            }
            return true;
        }
        return false;
    }

    private trySetRegionFromCache(controller: ControllerEx, old_areas: typeof this.areas) {
        const region = this.regionCache.get(controller.callsign);
        if (region) {
            old_areas.delete(region.station.icao);
            region.controllers.push(controller);
            controller.station = region;
            return true;
        }
        return false;
    }

    public getStation(icao: string): VatsimControl | undefined {
        const area = this.areas.get(icao);
        if (area) {
            return area;
        }

        const field = this.fields.get(icao);
        if (field) {
            return field;
        }
    }
}

export default ControlRadar;
