import { VatsimControl } from './Network/ControlRadar';
import { Controller, Pilot } from './Network/VATSIM';

class Cards {
    controllerRef?: (data: Controller | undefined) => void;
    pilotRef?: (data: Pilot | undefined) => void;
    facilityRef?: (data: VatsimControl | undefined) => void;
    stationsRef?: (show: boolean) => void;

    constructor() {
        map.clickEvent.add(e => {
            const feature = e[0];
            if (
                trafficRadar.onSelectStation(feature) ||
                controlRadar.onSelectStation(feature) ||
                feature.get('cards_ignore')
            ) {
                return;
            }
            this.controllerRef?.call(null, undefined);
            this.pilotRef?.call(null, undefined);
            this.facilityRef?.call(null, undefined);
        });
    }

    showControllerCard(data: Controller) {
        this.pilotRef?.call(null, undefined);
        this.controllerRef?.call(null, data);
        this.facilityRef?.call(null, undefined);
    }

    showPilotCard(data: Pilot) {
        this.controllerRef?.call(null, undefined);
        this.pilotRef?.call(null, data);
        this.facilityRef?.call(null, undefined);
    }

    showFacilityList(data: VatsimControl) {
        this.pilotRef?.call(null, undefined);
        this.controllerRef?.call(null, undefined);
        this.facilityRef?.call(null, data);
        this.stationsRef?.call(null, false);
    }

    showStationLists(show: boolean) {
        this.facilityRef?.call(null, undefined);
        this.stationsRef?.call(null, show);
    }
}
export default Cards;
