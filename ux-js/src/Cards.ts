import { Controller, Pilot } from './Network/VATSIM';

class Cards {
    private controllerRef?: (data: Controller | undefined) => void;
    private pilotRef?: (data: Pilot | undefined) => void;

    constructor() {

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
