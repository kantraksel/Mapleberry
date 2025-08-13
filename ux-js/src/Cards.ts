import { VatsimControl } from './Network/ControlRadar';
import { Atis, Controller, Pilot, Prefile } from './Network/VATSIM';

class Cards {
    controllerRef?: (data: Controller | undefined) => void;
    pilotRef?: (data: Pilot | undefined) => void;
    facilityRef?: (data: VatsimControl | undefined) => void;
    prefileRef?: (data: Prefile | undefined) => void;
    atisRef?: (data: Atis | undefined) => void;
    stationsRef?: (show: boolean) => void;

    private backList: (() => void)[];

    constructor() {
        this.backList = [];

        map.clickEvent.add(e => {
            const feature = e[0];
            if (
                trafficRadar.onSelectStation(feature) ||
                controlRadar.onSelectStation(feature)
            ) {
                this.backList = [ this.backList.pop()! ];
                return;
            }
            if (feature.get('cards_ignore')) {
                return;
            }
            this.close();
        });
    }

    showControllerCard(data: Controller) {
        this.backList.push(() => {});

        this.pilotRef?.call(null, undefined);
        this.controllerRef?.call(null, data);
        this.facilityRef?.call(null, undefined);
        this.prefileRef?.call(null, undefined);
        this.atisRef?.call(null, undefined);
        this.stationsRef?.call(null, false);
    }

    showPilotCard(data: Pilot, replaceHistory?: boolean) {
        if (replaceHistory) {
            this.backList.pop();
        }
        this.backList.push(() => {});

        this.controllerRef?.call(null, undefined);
        this.pilotRef?.call(null, data);
        this.facilityRef?.call(null, undefined);
        this.prefileRef?.call(null, undefined);
        this.atisRef?.call(null, undefined);
        this.stationsRef?.call(null, false);
    }
    
    showPrefileCard(data: Prefile) {
        this.backList.push(() => {});

        this.controllerRef?.call(null, undefined);
        this.pilotRef?.call(null, undefined);
        this.facilityRef?.call(null, undefined);
        this.prefileRef?.call(null, data);
        this.atisRef?.call(null, undefined);
        this.stationsRef?.call(null, false);
    }

    showFacilityList(data: VatsimControl) {
        const icao = data.icao;
        this.backList.push(() => {
            const data = controlRadar.getStation(icao);
            if (!data) {
                this.close();
                return;
            }
            this.showFacilityList(data);
        });

        this.pilotRef?.call(null, undefined);
        this.controllerRef?.call(null, undefined);
        this.facilityRef?.call(null, data);
        this.prefileRef?.call(null, undefined);
        this.atisRef?.call(null, undefined);
        this.stationsRef?.call(null, false);
    }

    showAtisCard(data: Atis) {
        this.backList.push(() => {});

        this.controllerRef?.call(null, undefined);
        this.pilotRef?.call(null, undefined);
        this.facilityRef?.call(null, undefined);
        this.prefileRef?.call(null, undefined);
        this.atisRef?.call(null, data);
        this.stationsRef?.call(null, false);
    }

    showStationLists(show: boolean) {
        this.backList.push(() => {
            this.showStationLists(true);
        });

        this.controllerRef?.call(null, undefined);
        this.pilotRef?.call(null, undefined);
        this.facilityRef?.call(null, undefined);
        this.prefileRef?.call(null, undefined);
        this.atisRef?.call(null, undefined);
        this.stationsRef?.call(null, show);
    }

    close() {
        this.backList = [];
        this.controllerRef?.call(null, undefined);
        this.pilotRef?.call(null, undefined);
        this.facilityRef?.call(null, undefined);
        this.prefileRef?.call(null, undefined);
        this.atisRef?.call(null, undefined);
        this.stationsRef?.call(null, false);
    }

    goBack() {
        const list = this.backList;
        list.pop();
        const func = list.pop();
        if (!func) {
            this.close();
            return;
        }
        list.push(func);
        func();
    }
}
export default Cards;
