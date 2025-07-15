import { Controller, Pilot } from './Network/VATSIM';

class Cards {
    private controllerRef?: (data: Controller | undefined) => void;
    private pilotRef?: (data: Pilot | undefined) => void;

    constructor() {
        map.clickEvent.add(e => {
            if (
                trafficRadar.onSelectStation(e) ||
                controlRadar.onSelectStation(e) ||
                e[0].get('cards_ignore')
            ) {
                return;
            }
            this.controllerRef?.call(null, undefined);
            this.pilotRef?.call(null, undefined);
        });
    }

    setControllerCard(cardRef: ((data: Controller | undefined) => void) | undefined) {
        this.controllerRef = cardRef;
    }

    setPilotCard(cardRef: ((data: Pilot | undefined) => void) | undefined) {
        this.pilotRef = cardRef;
    }

    showControllerCard(data: Controller) {
        this.pilotRef?.call(null, undefined);
        this.controllerRef?.call(null, data);
    }

    showPilotCard(data: Pilot) {
        this.controllerRef?.call(null, undefined);
        this.pilotRef?.call(null, data);
    }
}
export default Cards;
