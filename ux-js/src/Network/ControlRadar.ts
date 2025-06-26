import MapArea from '../Map/MapArea';
import MapField from '../Map/MapField';
import { Controller, LiveNetworkData } from './VATSIM';

class ControlRadar {
    private fields: Map<string, MapField>;
    private areas: Map<string, MapArea>;

    constructor() {
        this.fields = new Map();
        this.areas = new Map();

        vatsim.Update.add(networkData => { this.onRefresh(networkData); });
    }

    private clear() {
        this.fields.forEach(field => {
            controlLayers.removeField(field);
        });
        this.fields.clear();
    }

    private onRefresh(networkData?: LiveNetworkData) {
        if (!networkData) {
            this.clear();
            return;
        }

        const local_facilities = new Set<number>();
        const area_facilities = new Set<number>();
        networkData.facilities.forEach(value => {
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
        const airports = controlStations.airports;
        const airports_iata = controlStations.airports_iata;
        const fields = this.fields;

        const old_fields = new Map(fields);
        controllers.forEach(controller => {
            const callsign = controller.callsign;
            let id;

            const chIdx = callsign.search(/[_]/);
            if (chIdx < 0) {
                id = callsign;
            } else {
                id = callsign.substring(0, chIdx);
            }

            let airport = airports.get(id);
            if (!airport) {
                airport = airports_iata.get(id);
                if (!airport) {
                    console.warn(`Cannot find airport for ${callsign}`);
                    return;
                }

                id = airport.icao;
            }

            if (fields.has(id)) {
                old_fields.delete(id);
                return;
            }

            const field = new MapField();
            fields.set(id, field);

            field.params = airport;
            controlLayers.addField(field);
        });

        old_fields.forEach((field, icao) => {
            fields.delete(icao);
            controlLayers.removeField(field);
        });
    }

    private updateAreas(controllers: Controller[]) {
        const fir_stations = controlStations.firs;
        const fir_stations_prefix = controlStations.firs_prefix;
        const areas = this.areas;

        const old_areas = new Map(areas);
        controllers.forEach(controller => {
            const callsign = controller.callsign;

            const id_parts = callsign.split('_');
            let id = id_parts[0];

            let fir = fir_stations.get(id);
            if (!fir) {
                fir = fir_stations_prefix.get(id);
                if (!fir) {
                    for (let i = 1; i < id_parts.length; ++i) {
                        id = id_parts.slice(0, i).join('_');

                        fir = fir_stations_prefix.get(id);
                        if (fir) {
                            break;
                        }
                    }

                    if (!fir) {
                        console.warn(`Cannot find FIR/UIR for ${callsign}`);
                        return;
                    }
                }

                id = fir.icao;
            }

            if (areas.has(id)) {
                old_areas.delete(id);
                return;
            }

            const area = new MapArea(fir);
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
