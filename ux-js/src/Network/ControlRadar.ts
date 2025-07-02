import MapArea from '../Map/MapArea';
import MapField from '../Map/MapField';
import { Controller, NetworkStations } from './VATSIM';

class ControlRadar {
    private fields: Map<string, MapField>;
    private areas: Map<string, MapArea>;
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

    private clear() {
        this.fields.forEach(field => {
            controlLayers.removeField(field);
        });
        this.fields.clear();
        this.areas.forEach(area => {
            controlLayers.removeArea(area);
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

        const old_fields = new Map(fields);
        controllers.forEach(controller => {
            const callsign = controller.callsign;

            const airport = controlStations.getAirport(callsign);
            if (!airport) {
                console.warn(`Cannot find airport for ${callsign}`);
                return;
            }
            const id = airport.icao;

            if (fields.has(id)) {
                old_fields.delete(id);
                return;
            }

            const field = new MapField(airport);
            fields.set(id, field);
            controlLayers.addField(field);
        });

        old_fields.forEach((field, icao) => {
            fields.delete(icao);
            controlLayers.removeField(field);
        });
    }

    private updateAreas(controllers: Controller[]) {
        const areas = this.areas;

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

            if (areas.has(id)) {
                old_areas.delete(id);
                return;
            }

            const area = new MapArea(area_desc);
            areas.set(id, area);
            controlLayers.addArea(area);
        });

        old_areas.forEach((area, icao) => {
            areas.delete(icao);
            controlLayers.removeArea(area);
        });
    }
}

export default ControlRadar;
