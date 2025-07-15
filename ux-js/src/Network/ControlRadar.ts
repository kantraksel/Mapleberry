import { FeatureLike } from 'ol/Feature';
import MapArea, { StationDesc } from '../Map/MapArea';
import MapField from '../Map/MapField';
import { Airport_ext } from './ControlStations';
import { Controller, NetworkStations } from './VATSIM';

export class VatsimArea {
    area: MapArea;
    controllers: Controller[];

    constructor(desc: StationDesc) {
        this.area = new MapArea(desc);
        this.controllers = [];

        this.area.netState = this;
    }
}

export class VatsimField {
    field: MapField;
    controllers: Controller[];

    constructor(station: Airport_ext) {
        this.field = new MapField(station);
        this.controllers = [];

        this.field.netState = this;
    }
}

class ControlRadar {
    private fields: Map<string, VatsimField>;
    private areas: Map<string, VatsimArea>;
    private waitTimer: number;

    constructor() {
        this.fields = new Map();
        this.areas = new Map();
        this.waitTimer = 0;

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

    public onSelectStation(e: FeatureLike[]) {
        const obj = MapArea.getNetState(e[0]);
        if (obj) {
            //TODO: show controller list
            cards.showControllerCard(obj.controllers[0]);
            return true;
        }

        const obj2 = MapField.getNetState(e[0]);
        if (obj2) {
            //TODO: show controller list
            cards.showControllerCard(obj2.controllers[0]);
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

        this.updateFields(field_controllers);
        this.updateAreas(area_controllers);
    }

    private updateFields(controllers: Controller[]) {
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
                return;
            }
            const id = airport.icao;

            let field = fields.get(id);
            if (field) {
                old_fields.delete(id);
            } else {
                field = new VatsimField(airport);
                fields.set(id, field);
                controlLayers.addField(field.field);
            }
            field.controllers.push(controller);
        });

        old_fields.forEach((field, icao) => {
            fields.delete(icao);
            controlLayers.removeField(field.field);
        });
    }

    private updateAreas(controllers: Controller[]) {
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
                    return;
                }

                area_desc = fir;
            } else {
                area_desc = uir;
            }
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
}

export default ControlRadar;
