import { FeatureLike } from 'ol/Feature';
import MapArea, { StationDesc } from '../Map/MapArea';
import MapField from '../Map/MapField';
import { Airport_ext } from './ControlStations';
import { Atis, Controller, NetworkStations } from './VATSIM';
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

export type VatsimControl = VatsimArea | VatsimField;
export type ControllerEx = Controller & { station?: boolean };
export type AtisEx = Atis & { station?: boolean };

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

        vatsim.Update.add(networkData => {
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

                    this.onRefresh(vatsim.getNetworkData());
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

    private onRefresh(networkData?: NetworkStations) {
        if (!networkData) {
            this.clear();
            return;
        }

        const facilities = vatsim.getFacilities();
        const local_facilities = new Set<number>();
        const area_facilities = new Set<number>();
        facilities.forEach(value => {
            switch (value.short) {
                case 'DEL':
                case 'GND':
                case 'TWR':
                case 'APP':
                    local_facilities.add(value.id);
                    break;
                case 'FSS':
                case 'CTR':
                    area_facilities.add(value.id);
                    break;
            }
        });

        const field_controllers: Controller[] = [];
        const area_controllers: Controller[] = [];
        networkData.controllers.forEach(controller => {
            if (local_facilities.has(controller.facility)) {
                field_controllers.push(controller);
            } else if (area_facilities.has(controller.facility)) {
                area_controllers.push(controller);
            }
        });

        this.updateFields(field_controllers, networkData.atis);
        this.updateAreas(area_controllers);
        this.update.invoke();
    }

    private updateFields(controllers: ControllerEx[], atis: AtisEx[]) {
        const fields = this.fields;
        fields.forEach(field => {
            field.controllers = [];
        });

        const old_fields = new Map(fields);
        controllers.forEach(controller => {
            const callsign = controller.callsign;

            const airport = controlStations.getAirport(callsign);
            if (!airport) {
                console.warn(`Cannot find airport for ${callsign}`);
                controller.station = false;
                return;
            }
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
        });
        atis.forEach(atis => {
            const callsign = atis.callsign;

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

        old_fields.forEach((field, icao) => {
            fields.delete(icao);
            controlLayers.removeField(field.field);
        });
    }

    private updateAreas(controllers: ControllerEx[]) {
        const areas = this.areas;
        areas.forEach(area => {
            area.controllers = [];
        });

        const old_areas = new Map(areas);
        controllers.forEach(controller => {
            const callsign = controller.callsign;

            let area_desc;
            const uir = controlStations.getUIR(callsign);
            if (!uir) {
                const fir = controlStations.getFIR(callsign);
                if (!fir) {
                    console.warn(`Cannot find FIR/UIR for ${callsign}`);
                    controller.station = false;
                    return;
                }

                area_desc = fir;
            } else {
                area_desc = uir;
            }
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
        });

        old_areas.forEach((area, icao) => {
            areas.delete(icao);
            controlLayers.removeArea(area.area);
        });
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
