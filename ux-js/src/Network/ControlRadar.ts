import MapArea, { AreaDesc } from '../Map/MapArea';
import MapField from '../Map/MapField';
import { Airport_ext } from './ControlStations';
import { Controller, NetworkStations } from './VATSIM';

class VatsimArea {
    area: MapArea;
    controller: Controller;

    constructor(params: AreaDesc, controller: Controller) {
        this.area = new MapArea(params);
        this.controller = controller;
    }
}

class VatsimField {
    field: MapField;
    controller: Controller;

    constructor(params: Airport_ext, controller: Controller) {
        this.field = new MapField(params);
        this.controller = controller;
    }
}

class ControlRadar {
    private fields: Map<string, VatsimField>;
    private areas: Map<string, VatsimArea>;
    private waitTimer: number;
    private stationsById: Map<number, VatsimArea | VatsimField>;

    constructor() {
        this.fields = new Map();
        this.areas = new Map();
        this.waitTimer = 0;
        this.stationsById = new Map();

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

        map.clickEvent.add(e => {
            const id = MapArea.getNetId(e);
            if (id === null) {
                return;
            }
            const plane = this.stationsById.get(id);
            if (!plane) {
                return;
            }
            cards.showControllerCard(plane.controller);
        });
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
        const stationsById = this.stationsById;
        stationsById.clear();

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
                field.controller = controller;
                old_fields.delete(id);
            } else {
                field = new VatsimField(airport, controller);
                fields.set(id, field);
                controlLayers.addField(field.field);
            }
            stationsById.set(controller.cid, field);
            field.field.netId = controller.cid;
        });

        old_fields.forEach((field, icao) => {
            fields.delete(icao);
            controlLayers.removeField(field.field);
        });
    }

    private updateAreas(controllers: Controller[]) {
        const areas = this.areas;
        const stationsById = this.stationsById;
        stationsById.clear();

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
                area.controller = controller;
                old_areas.delete(id);
                return;
            } else {
                area = new VatsimArea(area_desc, controller);
                areas.set(id, area);
                controlLayers.addArea(area.area);
            }
            stationsById.set(controller.cid, area);
            area.area.netId = controller.cid;
        });

        old_areas.forEach((area, icao) => {
            areas.delete(icao);
            controlLayers.removeArea(area.area);
        });
    }
}

export default ControlRadar;
