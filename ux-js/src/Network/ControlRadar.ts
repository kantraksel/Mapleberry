import MapField from '../Map/MapField';
import { Controller, LiveNetworkData } from './VATSIM';

class ControlRadar {
    private fields: Map<string, MapField>;

    constructor() {
        this.fields = new Map();

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
        networkData.facilities.forEach(value => {
            switch (value.short) {
                case 'DEL':
                case 'GND':
                case 'TWR':
                case 'APP':
                    local_facilities.add(value.id);
                    break;
            }
        });

        this.updateFields(networkData.controllers, local_facilities);
    }

    private updateFields(controllers: Controller[], local_facilities: Set<number>) {
        const airports = controlStations.airports;
        const airports_iata = controlStations.airports_iata;
        const fields = this.fields;

        const old_fields = new Map<string, MapField>(fields);
        controllers.forEach(controller => {
            if (local_facilities.has(controller.facility)) {
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
            }
        });

        old_fields.forEach((field, icao) => {
            this.fields.delete(icao);
            controlLayers.removeField(field);
        });
    }
}

export default ControlRadar;
