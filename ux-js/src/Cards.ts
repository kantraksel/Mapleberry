import { NetworkAtis, NetworkControl, NetworkController, NetworkField } from './Network/ControlRadar';
import { NetworkPilot } from './Network/TrafficRadar';
import { Prefile } from './Network/VATSIM';

class Cards {
    controllerRef?: (data: NetworkController | undefined) => void;
    pilotRef?: (data: NetworkPilot | undefined) => void;
    facilityRef?: (data: NetworkControl | undefined) => void;
    prefileRef?: (data: Prefile | undefined) => void;
    atisRef?: (data: NetworkAtis | undefined) => void;
    stationsRef?: (show: boolean) => void;

    private backList: (() => void)[];

    constructor() {
        this.backList = [];

        map.clickEvent.add(e => {
            for (let i = 0; i < e.length; ++i) {
                const feature = e[i];
                if (feature.get('cards_ignore')) {
                    continue;
                }
                if (
                    trafficRadar.onSelectStation(feature) ||
                    controlRadar.onSelectStation(feature)
                ) {
                    this.backList = [ this.backList.pop()! ];
                    return;
                }
                this.close();
                break;
            }
        });
        map.cursorEvent.add(e => {
            for (let i = 0; i < e.length; ++i) {
                const feature = e[i];
                if (feature.get('cards_ignore')) {
                    continue;
                }
                if (
                    trafficRadar.isInteractable(feature) ||
                    controlRadar.isInteractable(feature)
                ) {
                    map.setCursor(true);
                    return;
                }
                break;
            }
            map.setCursor(false);
        });
    }

    showControllerCard(data: NetworkController) {
        this.backList.push(() => {
            if (!data.expired()) {
                this.showControllerCard(data);
                return;
            } else {
                const controller = controlRadar.findController(data);
                if (controller) {
                    this.showControllerCard(controller);
                    return;
                }
            }
            this.goBack();
        });

        this.pilotRef?.call(null, undefined);
        this.controllerRef?.call(null, data);
        this.facilityRef?.call(null, undefined);
        this.prefileRef?.call(null, undefined);
        this.atisRef?.call(null, undefined);
        this.stationsRef?.call(null, false);
    }

    showPilotCard(data: NetworkPilot, replaceHistory?: boolean) {
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

    showFacilityList(data: NetworkControl) {
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

    showAtisCard(data: NetworkAtis) {
        this.backList.push(() => {
            const station = controlRadar.getStation(data.station.icao);
            if (!(station instanceof NetworkField)) {
                this.close();
                return;
            }
            const atis = station.atis.find(atis => atis.data.callsign === data.data.callsign);
            if (!atis) {
                this.close();
                return;
            }
            this.showAtisCard(atis);
        });

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
        func();
    }
}
export default Cards;
