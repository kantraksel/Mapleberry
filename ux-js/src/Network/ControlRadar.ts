import { FeatureLike } from 'ol/Feature';
import MapArea, { StationDesc } from '../Map/MapArea';
import MapField from '../Map/MapField';
import { Airport_ext, Tracon } from './ControlStations';
import { Atis, Controller, NetworkState } from './NetworkWorld';
import Event from '../Event';
import MapTracon from '../Map/MapTracon';

class RefObject {
    refCount: number;

    constructor() {
        this.refCount = 1;
    }

    addRef() {
        this.refCount++;
    }

    expired() {
        return this.refCount <= 0;
    }
}

export class NetworkArea extends RefObject {
    readonly icao: string;
    readonly area: MapArea;
    controllers: NetworkController[];
    readonly station: StationDesc;

    constructor(desc: StationDesc) {
        super();
        this.area = new MapArea(desc);
        this.controllers = [];
        this.station = desc;
        this.icao = desc.icao;

        this.area.netState = this;
    }
}

export class NetworkField extends RefObject {
    readonly icao: string;
    readonly field: MapField;
    tracons: NetworkTracon[];
    controllers: NetworkController[];
    atis: NetworkAtis[];
    readonly station: Airport_ext;
    isOutlined: boolean;

    constructor(station: Airport_ext) {
        super();
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

export class NetworkController extends RefObject {
    readonly station?: NetworkControl;
    substation?: NetworkTracon;
    data: Controller;

    constructor(data: Controller, station: NetworkControl | undefined) {
        super();
        this.data = data;
        this.station = station;
    }

    addTracon(tracon: Tracon) {
        if (this.station instanceof NetworkField) {
            this.substation = new NetworkTracon(MapTracon.create(tracon, this.station.station));
        } else {
            this.substation = new NetworkTracon(MapTracon.createStandalone(tracon));
        }
        return this.substation;
    }

    isEqual(other: Controller) {
        const data = this.data;
        return data.cid === other.cid && data.callsign === other.callsign;
    }

    addRef() {
        this.refCount++;
        this.station?.addRef();
        this.substation?.addRef();
    }
}

export class NetworkAtis extends RefObject {
    readonly station: NetworkField;
    data: Atis;

    constructor(data: Atis, station: NetworkField) {
        super();
        this.data = data;
        this.station = station;
    }

    addRef() {
        this.refCount++;
        this.station.addRef();
    }
}

export class NetworkTracon extends RefObject {
    readonly substation: MapTracon;

    constructor(substation: MapTracon) {
        super();
        this.substation = substation;
    }
}

function createUID(controller: Controller) {
    return `${controller.callsign};${controller.cid}`;
}

export type NetworkControl = NetworkArea | NetworkField;

class ControlRadar {
    private fields: Map<string, NetworkField>;
    private areas: Map<string, NetworkArea>;
    private standaloneTracons: Map<string, NetworkController>;
    private orphans: Map<string, NetworkController>;
    private controllerCache: Map<string, NetworkController>;
    private atisCache: Map<string, NetworkAtis>;
    public readonly Update: Event<() => void>;

    constructor() {
        this.fields = new Map();
        this.areas = new Map();
        this.standaloneTracons = new Map();
        this.orphans = new Map();
        this.controllerCache = new Map();
        this.atisCache = new Map();
        this.Update = new Event();

        controlStations.Ready.add(() => {
            this.onRefresh(network.getState());
        });
        network.Update.add(state => {
            if (controlStations.isReady())
                this.onRefresh(state);
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
            field.tracons.forEach(controller => {
                controlLayers.removeTracon(controller.substation!);
            });
        });
        this.areas.forEach(area => {
            controlLayers.removeArea(area.area);
        });
        this.standaloneTracons.forEach(controller => {
            controlLayers.removeTracon(controller.substation!.substation);
        });
        this.fields.clear();
        this.areas.clear();
        this.standaloneTracons.clear();
        this.orphans.clear();
        this.controllerCache.clear();
        this.atisCache.clear();

        this.Update.invoke();
    }

    private onRefresh(networkData?: NetworkState) {
        if (!networkData) {
            this.clear();
            return;
        }

        this.fields.forEach(field => {
            field.controllers.forEach(controller => {
                controller.refCount = 0;
            });
            field.atis.forEach(atis => {
                atis.refCount = 0;
            });
            field.tracons.forEach(tracon => {
                tracon.refCount = 0;
            });
            field.refCount = 0;
        });
        this.areas.forEach(area => {
            area.controllers.forEach(controller => {
                controller.refCount = 0;
            });
            area.refCount = 0;
        });
        this.standaloneTracons.forEach(tracon => {
            tracon.refCount = 0;
        });
        this.orphans.forEach(controller => {
            controller.refCount = 0;
        });

        const local_facilities = network.getLocalFacilities();
        networkData.controllers.forEach(controller => {
            let obj = this.controllerCache.get(createUID(controller));
            if (obj) {
                obj.addRef();
                obj.data = controller;

                if (obj.station instanceof NetworkField) {
                    const airport = obj.station;
                    if (airport.isOutlined) {
                        airport.setFill();
                    }
                }
                return true;
            }

            let facility_type;
            if (local_facilities.has(controller.facility)) {
                if (this.setFieldController(controller)) {
                    return;
                }
                if (this.setAreaController(controller)) {
                    return;
                }
                facility_type = 'airport';
            } else {
                if (this.setAreaController(controller)) {
                    return;
                }
                if (this.setFieldController(controller)) {
                    return;
                }
                facility_type = 'FIR/UIR';
            }

            if (this.setStandaloneTraconController(controller)) {
                return;
            }

            console.warn(`Cannot find ${facility_type} for ${controller.callsign}`);
            obj = new NetworkController(controller, undefined);
            const uid = createUID(controller);
            this.orphans.set(uid, obj);
            this.controllerCache.set(uid, obj);
        });
        this.updateAtis(networkData.atis);

        this.areas.forEach((area, icao) => {
            if (area.expired()) {
                this.areas.delete(icao);
                controlLayers.removeArea(area.area);
                area.controllers.forEach(controller => {
                    this.controllerCache.delete(createUID(controller.data));
                });
                return;
            }

            area.controllers = area.controllers.filter(controller => {
                if (controller.expired()) {
                    this.controllerCache.delete(createUID(controller.data));
                    return false;
                }
                return true;
            });
        });
        this.fields.forEach((field, icao) => {
            if (field.expired()) {
                this.fields.delete(icao);
                controlLayers.removeField(field.field);
                field.tracons.forEach(controller => {
                    controlLayers.removeTracon(controller.substation!);
                });
                field.atis.forEach(atis => {
                    this.atisCache.delete(createUID(atis.data));
                });
                field.controllers.forEach(controller => {
                    this.controllerCache.delete(createUID(controller.data));
                });
                return;
            }

            field.controllers = field.controllers.filter(controller => {
                if (controller.expired()) {
                    this.controllerCache.delete(createUID(controller.data));
                    return false;
                }
                return true;
            });
            field.atis = field.atis.filter(atis => {
                if (atis.expired()) {
                    this.controllerCache.delete(createUID(atis.data));
                    return false;
                }
                return true;
            });
            field.tracons = field.tracons.filter(controller => {
                if (controller.expired()) {
                    controlLayers.removeTracon(controller.substation!);
                    return false;
                }
                return true;
            });
        });
        this.standaloneTracons.forEach((controller, uid) => {
            if (controller.expired()) {
                controlLayers.removeTracon(controller.substation!.substation);
                this.standaloneTracons.delete(uid);
                this.controllerCache.delete(uid);
            }
        });
        this.orphans.forEach((controller, uid) => {
            if (controller.expired()) {
                this.orphans.delete(uid);
                this.controllerCache.delete(uid);
            }
        });

        this.Update.invoke();
    }

    private setFieldController(data: Controller) {
        const airport = controlStations.getAirport(data.callsign);
        if (!airport) {
            return false;
        }

        let field = this.fields.get(airport.icao);
        if (field) {
            field.addRef();

            if (field.isOutlined) {
                field.setFill();
            }
        } else {
            field = new NetworkField(airport);
            this.fields.set(airport.icao, field);
            controlLayers.addField(field.field);
        }

        const obj = new NetworkController(data, field);
        field.controllers.push(obj);
        this.controllerCache.set(createUID(data), obj);

        this.setTraconController(obj, field);
        return true;
    }

    private updateAtis(atis: Atis[]) {
        atis.forEach(atis => {
            let controller = this.atisCache.get(createUID(atis));
            if (controller) {
                controller.addRef();
                controller.data = atis;

                const airport = controller.station;
                if (!airport.isOutlined && airport.controllers.length == 0) {
                    airport.setOutline();
                }
                return;
            }

            const airport = controlStations.getAirport(atis.callsign);
            if (!airport) {
                console.warn(`Cannot find airport for ${atis.callsign}`);
                return;
            }

            let field = this.fields.get(airport.icao);
            if (field) {
                field.addRef();

                if (!field.isOutlined && field.controllers.length == 0) {
                    field.setOutline();
                }
            } else {
                field = new NetworkField(airport);
                this.fields.set(airport.icao, field);
                controlLayers.addField(field.field);

                field.setOutline();
            }
            const obj = new NetworkAtis(atis, field);
            field.atis.push(obj);
            this.atisCache.set(createUID(atis), obj);
        });
    }

    private setAreaController(data: Controller) {
        const region = controlStations.getRegion(data.callsign);
        if (!region) {
            return false;
        }

        let area = this.areas.get(region.icao);
        if (area) {
            area.addRef();
        } else {
            area = new NetworkArea(region);
            this.areas.set(region.icao, area);
            controlLayers.addArea(area.area);
        }

        const obj = new NetworkController(data, area);
        area.controllers.push(obj);
        this.controllerCache.set(createUID(data), obj);
        return true;
    }

    private setTraconController(controller: NetworkController, airport: NetworkField) {
        const station = controlStations.getTracon(controller.data.callsign);
        if (station) {
            if (!(airport instanceof NetworkField)) {
                return;
            }
            let tracon = airport.tracons.find(value => station === value.substation!.substation);
            if (!tracon) {
                tracon = controller.addTracon(station);
                airport.tracons.push(tracon);
                controlLayers.addTracon(tracon.substation!);
            } else {
                controller.substation = tracon;
                tracon.addRef();
            }
        } else {
            const approach_id = network.getApproachId();
            if (controller.data.facility == approach_id) {
                let tracon = airport.tracons.find(value => value.substation!.substation.geometry.length === 0);
                if (tracon) {
                    controller.substation = tracon;
                    tracon.addRef();
                    return;
                }

                const id_parts = controller.data.callsign.split(/[_-]/);
                const suffix = id_parts.pop() ?? 'APP';
                const substation = {
                    prefix: [ id_parts.join('_') ],
                    suffix: suffix,
                    name: 'Approach',
                    geometry: [],

                    airport: airport.station,
                };
                tracon = controller.addTracon(substation);
                airport.tracons.push(tracon);
                controlLayers.addTracon(tracon.substation!);
            }
        }
    }

    private setStandaloneTraconController(data: Controller) {
        const tracon = this.standaloneTracons.get(createUID(data));
        if (tracon) {
            tracon.addRef();
            tracon.data = data;
            return true;
        }

        const station = controlStations.getTracon(data.callsign);
        if (station) {
            const controller = new NetworkController(data, undefined);
            const tracon = controller.addTracon(station);
            controlLayers.addTracon(tracon.substation);

            const uid = createUID(data);
            this.standaloneTracons.set(uid, controller);
            this.controllerCache.set(uid, controller);
            return true;
        } else {
            const approach_id = network.getApproachId();
            if (data.facility == approach_id) {
                const id_parts = data.callsign.split(/[_-]/);
                const suffix = id_parts.pop() ?? 'APP';
                const substation = {
                    prefix: [ id_parts.join('_') ],
                    suffix: suffix,
                    name: 'Approach',
                    geometry: [],

                    airport: undefined,
                };
                const controller = new NetworkController(data, undefined);
                const tracon = controller.addTracon(substation);
                controlLayers.addTracon(tracon.substation);

                const uid = createUID(data);
                this.standaloneTracons.set(uid, controller);
                this.controllerCache.set(uid, controller);
                return true;
            }
        }
        return false;
    }

    public getStation(icao: string): NetworkControl | undefined {
        const area = this.areas.get(icao);
        if (area) {
            return area;
        }

        const field = this.fields.get(icao);
        if (field) {
            return field;
        }
    }

    public getControllerList() {
        return Array.from(this.controllerCache.values());
    }

    public getAtisList() {
        return Array.from(this.atisCache.values());
    }

    public findController(controller: NetworkController) {
        return this.controllerCache.get(createUID(controller.data));
    }

    public findAtis(atis: NetworkAtis) {
        return this.atisCache.get(createUID(atis.data));
    }
}

export default ControlRadar;
