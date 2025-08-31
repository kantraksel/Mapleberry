import { FeatureLike } from 'ol/Feature';
import MapArea, { StationDesc } from '../Map/MapArea';
import MapField from '../Map/MapField';
import { Airport_ext } from './ControlStations';
import { Atis, Controller, NetworkState } from './NetworkWorld';
import Event from '../Event';
import MapTracon from '../Map/MapTracon';

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
    tracons: MapTracon[];
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
        this.tracons = [];

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
export type ControllerEx = Controller & { station?: VatsimControl, type?: BroadcastType, substation?: MapTracon };
export type AtisEx = Atis & { station?: VatsimControl, type?: BroadcastType };

class ControlRadar {
    private fields: Map<string, VatsimField>;
    private areas: Map<string, VatsimArea>;
    private airportCache: Map<string, VatsimField>;
    private regionCache: Map<string, VatsimArea>;
    private standaloneTracons: Map<string, MapTracon>;
    private waitTimer: number;
    public readonly update: Event<() => void>;

    constructor() {
        this.fields = new Map();
        this.areas = new Map();
        this.airportCache = new Map();
        this.regionCache = new Map();
        this.standaloneTracons = new Map();
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
            field.tracons.forEach(tracon => {
                controlLayers.removeTracon(tracon);
            });
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
            field.controllers.forEach((controller: ControllerEx) => {
                const newController = networkData.controllers.find(value => value.callsign === controller.callsign) as ControllerEx | undefined;
                if (newController) {
                    newController.station = controller.station;
                    newController.substation = controller.substation;
                }
            });

            field.controllers = [];
            field.atis = [];
            field.tracons.forEach(tracon => {
                tracon.refCount = 0;
            });
        });
        const old_fields = new Map(fields);
        const oldAirportCache = new Map(this.airportCache);
        this.standaloneTracons.forEach(tracon => {
            tracon.refCount = 0;
        });

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
                        if (this.setStandaloneTraconController(controller)) {
                            return;
                        }
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
                        if (this.setStandaloneTraconController(controller)) {
                            return;
                        }
                        console.warn(`Cannot find FIR/UIR for ${callsign}`);
                    }
                }
            }
        });
        this.updateAtis(networkData.atis, old_fields, oldAirportCache);

        old_fields.forEach((field, icao) => {
            fields.delete(icao);
            controlLayers.removeField(field.field);
            field.tracons.forEach(tracon => {
                controlLayers.removeTracon(tracon);
            });
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
        fields.forEach(field => {
            field.tracons = field.tracons.filter(tracon => {
                if (tracon.refCount <= 0) {
                    controlLayers.removeTracon(tracon);
                    return false;
                }
                return true;
            })
        });
        this.standaloneTracons.forEach((tracon, callsign) => {
            if (tracon.refCount <= 0) {
                controlLayers.removeTracon(tracon);
                this.standaloneTracons.delete(callsign);
            }
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

        this.setTraconController(controller, field);
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
            if (controller.substation) {
                controller.substation.refCount++;
            }

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

    private setTraconController(controller: ControllerEx, field: VatsimField) {
        if (controller.substation) {
            controller.substation.refCount++;
            return;
        }

        const station = controlStations.getTracon(controller.callsign);
        if (station) {
            let tracon = field.tracons.find(value => station === value.substation);
            if (!tracon) {
                tracon = MapTracon.create(station, field.station);
                field.tracons.push(tracon);
                controlLayers.addTracon(tracon);
            } else {
                tracon.refCount++;
            }
            controller.substation = tracon;
        } else {
            const app_facility = network.getFacilities().find(value => value.short === 'APP')?.id ?? 0;
            if (controller.facility == app_facility) {
                let tracon = field.tracons.find(value => value.substation.geometry.length === 0);
                if (tracon) {
                    controller.substation = tracon;
                    tracon.refCount++;
                    return;
                }

                const id_parts = controller.callsign.split(/[_-]/);
                const suffix = id_parts.pop() ?? 'APP';
                const substation = {
                    prefix: [ id_parts.join('_') ],
                    suffix: suffix,
                    name: 'Approach',
                    geometry: [],

                    airport: field.station,
                };
                tracon = MapTracon.create(substation, field.station);
                controller.substation = tracon;
                field.tracons.push(tracon);
                controlLayers.addTracon(tracon);
            }
        }
    }

    private setStandaloneTraconController(controller: ControllerEx) {
        if (controller.substation) {
            controller.substation.refCount++;
            return true;
        }

        const station = controlStations.getTracon(controller.callsign);
        if (station) {
            const tracon = MapTracon.createStandalone(station);
            controller.substation = tracon;
            this.standaloneTracons.set(controller.callsign, tracon);
            controlLayers.addTracon(tracon);
            return true;
        } else {
            const app_facility = network.getFacilities().find(value => value.short === 'APP')?.id ?? 0;
            if (controller.facility == app_facility) {
                const id_parts = controller.callsign.split(/[_-]/);
                const suffix = id_parts.pop() ?? 'APP';
                const substation = {
                    prefix: [ id_parts.join('_') ],
                    suffix: suffix,
                    name: 'Approach',
                    geometry: [],

                    airport: undefined,
                };
                const tracon = MapTracon.createStandalone(substation);
                controller.substation = tracon;
                this.standaloneTracons.set(controller.callsign, tracon);
                controlLayers.addTracon(tracon);
                return true;
            }
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
