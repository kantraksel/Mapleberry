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
export type ControllerEx = Controller & { station?: boolean, type?: BroadcastType };
export type AtisEx = Atis & { station?: boolean, type?: BroadcastType };

class ControlRadar {
    private fields: Map<string, VatsimField>;
    private areas: Map<string, VatsimArea>;
    private waitTimer: number;
    public readonly update: Event<() => void>;

    constructor() {
        this.fields = new Map();
        this.areas = new Map();
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
            if ((controllers.length + atis.length) > 1) {
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

        const areas = this.areas;
        areas.forEach(area => {
            area.controllers = [];
        });
        const old_areas = new Map(areas);

        networkData.controllers.forEach((controller: ControllerEx) => {
            const callsign = controller.callsign;
            controller.type = BroadcastType.Control;
            controller.station = false;

            if (local_facilities.has(controller.facility)) {
                const airport = controlStations.getAirport(callsign);
                if (airport) {
                    this.setFieldController(controller, old_fields, airport);
                } else {
                    const region = controlStations.getRegion(callsign);
                    if (region) {
                        this.setAreaController(controller, old_areas, region);
                    } else {
                        console.warn(`Cannot find airport for ${callsign}`);
                    }
                }
            } else {
                const region = controlStations.getRegion(callsign);
                if (region) {
                    this.setAreaController(controller, old_areas, region);
                } else {
                    const airport = controlStations.getAirport(callsign);
                    if (airport) {
                        this.setFieldController(controller, old_fields, airport);
                    } else {
                        console.warn(`Cannot find FIR/UIR for ${callsign}`);
                    }
                }
            }
        });
        this.updateAtis(networkData.atis, old_fields);

        old_fields.forEach((field, icao) => {
            fields.delete(icao);
            controlLayers.removeField(field.field);
        });
        old_areas.forEach((area, icao) => {
            areas.delete(icao);
            controlLayers.removeArea(area.area);
        });

        this.update.invoke();
    }

    private setFieldController(controller: ControllerEx, old_fields: typeof this.fields, airport: Airport_ext) {
        const fields = this.fields;

        controller.station = true;
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
    }

    private updateAtis(atis: AtisEx[], old_fields: typeof this.fields) {
        const fields = this.fields;

        atis.forEach(atis => {
            const callsign = atis.callsign;
            atis.type = BroadcastType.ATIS;

            const airport = controlStations.getAirport(callsign);
            if (!airport) {
                console.warn(`Cannot find airport for ${callsign}`);
                atis.station = false;
                return;
            }
            atis.station = true;
            const id = airport.icao;

            let field = fields.get(id);
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
        });
    }

    private setAreaController(controller: ControllerEx, old_areas: typeof this.areas, area_desc: StationDesc) {
        const areas = this.areas;

        controller.station = true;
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
