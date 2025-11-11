import { FeatureLike } from 'ol/Feature';
import MapArea from '../Map/MapArea';
import MapField from '../Map/MapField';
import { splitCallsign } from './Source/ControlStations';
import { NetworkState } from './Source/NetworkWorld';
import Event from './../Event';
import MapTracon from './../Map/MapTracon';
import { Atis, Controller } from './Source/Objects/LiveNetworkData';
import NetworkField from './Source/Objects/NetworkField';
import NetworkArea from './Source/Objects/NetworkArea';
import NetworkController from './Source/Objects/NetworkController';
import NetworkAtis from './Source/Objects/NetworkAtis';
import NetworkTracon from './Source/Objects/NetworkTracon';
import NetworkControl from './Source/Objects/NetworkControl';

function createUID(data: { cid: number, callsign: string }) {
    return `${data.callsign};${data.cid}`;
}

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
            this.onNetUpdate(network.getState());
        });
        network.Update.add(state => {
            this.onNetUpdate(state);
        });
    }

    private onNetUpdate(state?: NetworkState) {
        if (controlStations.isReady()) {
            try {
                this.onRefresh(state);
            } catch (e: unknown) {
                console.error('Error while updating ControlRadar:');
                console.error(e);
                this.clear();
            }
        }
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
            if (controllers.length > 1) {
                cards.showFacilityList(obj2);
            } else if (controllers.length > 0) {
                cards.showControllerCard(controllers[0]);
            } else if (atis.length > 1) {
                cards.showFacilityList(obj2);
            } else {
                cards.showAtisCard(atis[0]);
            }
            return true;
        }

        const obj3 = MapTracon.getNetState(e);
        if (obj3) {
            cards.showControllerCard(obj3.controllers[0]);
            return true;
        }

        return false;
    }

    public isInteractable(e: FeatureLike) {
        const obj = MapArea.getNetState(e);
        if (obj) {
            return true;
        }

        const obj2 = MapField.getNetState(e);
        if (obj2) {
            return true;
        }

        const obj3 = MapTracon.getNetState(e);
        if (obj3) {
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
            try {
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
            } catch (e: unknown) {
                console.error(e);
                console.error(`^ was thrown while processing controller ${controller.callsign ?? 'INVALID'}/${controller.cid ?? 'INVALID'}`);

                try {
                    const obj = new NetworkController(controller, undefined);
                    const uid = createUID(controller);
                    this.orphans.set(uid, obj);
                    this.controllerCache.set(uid, obj);
                } catch (e: unknown) {
                    console.error('Cannot create orphan entry:');
                    console.error(e);
                }
            }
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
            field.tracons = field.tracons.filter(tracon => {
                if (tracon.expired()) {
                    controlLayers.removeTracon(tracon.substation!);
                    return false;
                }
                tracon.controllers = tracon.controllers.filter(controller => !controller.expired());
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
            try {
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
            } catch (e: unknown) {
                console.error(e);
                console.error(`^ was thrown while processing ATIS ${atis.callsign ?? 'INVALID'}/${atis.cid ?? 'INVALID'}`);
            }
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
        const [sid, station] = controlStations.getTracon(controller.data.callsign);
        if (station) {
            if (!(airport instanceof NetworkField)) {
                return;
            }
            let tracon = airport.tracons.find(value => station === value.substation.substation);
            if (!tracon) {
                tracon = controller.addTracon(station, sid);
                airport.tracons.push(tracon);
                controlLayers.addTracon(tracon.substation!);
            } else {
                controller.substation = tracon;
                tracon.addRef();
            }
            tracon.controllers.push(controller);

            for (let i = 0; i < airport.tracons.length; ++i) {
                const a = airport.tracons[i];
                if (a.substation.substation.geometry.length === 0) {
                    for (let j = 0; j < a.controllers.length; ++j) {
                        const controller = a.controllers[j];
                        controller.substation = tracon;
                        tracon.addRef();
                        tracon.controllers.push(controller);
                    }
                    controlLayers.removeTracon(a.substation);
                    a.controllers = [];
                    a.refCount = 0;
                }
            }
        } else {
            const approach_id = network.getApproachId();
            if (controller.data.facility == approach_id) {
                const id_parts = splitCallsign(controller.data.callsign);
                const suffix = id_parts.pop() ?? 'APP';

                let tracon = airport.tracons.find(value => value.substation.substation.suffix == suffix);
                if (!tracon) {
                    tracon = airport.tracons.find(value => value.substation.substation.suffix == 'APP');
                    if (!tracon) {
                        tracon = airport.tracons.find(value => value.substation.substation.geometry.length === 0);
                        if (!tracon) {
                            tracon = airport.tracons[0] as NetworkTracon | undefined;
                        }
                    }
                }
                if (tracon) {
                    controller.substation = tracon;
                    tracon.addRef();
                    tracon.controllers.push(controller);
                    return;
                }

                const substation = {
                    prefix: [ id_parts.join('_') ],
                    suffix: suffix,
                    name: 'Approach',
                    geometry: [],

                    airport: airport.station,
                };
                tracon = controller.addTracon(substation, sid);
                tracon.controllers.push(controller);
                airport.tracons.push(tracon);
                controlLayers.addTracon(tracon.substation);
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

        const [sid, station] = controlStations.getTracon(data.callsign);
        if (station) {
            const controller = new NetworkController(data, undefined);
            const tracon = controller.addTracon(station, sid);
            tracon.controllers.push(controller);
            controlLayers.addTracon(tracon.substation);

            const uid = createUID(data);
            this.standaloneTracons.set(uid, controller);
            this.controllerCache.set(uid, controller);
            return true;
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
