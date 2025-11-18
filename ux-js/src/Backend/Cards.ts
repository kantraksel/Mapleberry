import Event from './Event';
import { Prefile } from './NetworkUplink/Source/Objects/LiveNetworkData';
import NetworkAtis from './NetworkUplink/Source/Objects/NetworkAtis';
import NetworkControl from './NetworkUplink/Source/Objects/NetworkControl';
import NetworkController from './NetworkUplink/Source/Objects/NetworkController';
import NetworkField from './NetworkUplink/Source/Objects/NetworkField';
import NetworkPilot from './NetworkUplink/Source/Objects/NetworkPilot';

export enum CardType {
    None,
    Controller,
    Pilot,
    Prefile,
    Atis,
    Facility,
    Stations,
}

class Cards {
    controllerRef?: (data: NetworkController | undefined) => void;
    pilotRef?: (data: NetworkPilot | undefined) => void;
    facilityRef?: (data: NetworkControl | undefined) => void;
    prefileRef?: (data: Prefile | undefined) => void;
    atisRef?: (data: NetworkAtis | undefined) => void;
    stationsRef?: (show: boolean) => void;
    facilityRefresh?: () => void;

    private backList: (() => void)[];
    private activeType: CardType;
    public Change: Event<(from: CardType, to: CardType) => void>;

    private showAtisInFacilityView_: boolean;

    constructor() {
        this.backList = [];
        this.activeType = CardType.None;
        this.Change = new Event();

        this.showAtisInFacilityView_ = options.get<boolean>('cards_show_atis_facility_view', true);

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

        this.controllerRef?.call(null, data);
        this.changeCard(CardType.Controller);
    }

    showPilotCard(data: NetworkPilot, replaceOne?: boolean, replaceAll?: boolean) {
        if (replaceOne) {
            this.backList.pop();
        }
        if (replaceAll) {
            this.backList = [];
        }
        this.backList.push(() => {});

        this.pilotRef?.call(null, data);
        this.changeCard(CardType.Pilot);
    }
    
    showPrefileCard(data: Prefile) {
        this.backList.push(() => {});

        this.prefileRef?.call(null, data);
        this.changeCard(CardType.Prefile);
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

        this.facilityRef?.call(null, data);
        this.changeCard(CardType.Facility);
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

        this.atisRef?.call(null, data);
        this.changeCard(CardType.Atis);
    }

    showStationLists(show: boolean) {
        this.backList.push(() => {
            this.showStationLists(true);
        });

        this.stationsRef?.call(null, show);
        this.changeCard(CardType.Stations);
    }

    close() {
        this.backList = [];
        this.changeCard(CardType.None);
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

    private changeCard(to: CardType) {
        const from = this.activeType;
        if (from != to) {
            this.closeCard(from);
        }
        
        this.activeType = to;
        this.Change.invoke(from, to);
    }

    private closeCard(card: CardType) {
        switch (card) {
            case CardType.None:
                break;
            case CardType.Controller: {
                this.controllerRef?.call(null, undefined);
                break;
            }
            case CardType.Pilot: {
                this.pilotRef?.call(null, undefined);
                break;
            }
            case CardType.Prefile: {
                this.prefileRef?.call(null, undefined);
                break;
            }
            case CardType.Atis: {
                this.atisRef?.call(null, undefined);
                break;
            }
            case CardType.Facility: {
                this.facilityRef?.call(null, undefined);
                break;
            }
            case CardType.Stations: {
                this.stationsRef?.call(null, false);
                break;
            }
            default:
                throw new Error('CardType not implemented');
        }
    }

    public set showAtisInFacilityView(value: boolean) {
        this.showAtisInFacilityView_ = value;
        options.set('cards_show_atis_facility_view', value);

        if (this.activeType == CardType.Facility) {
            this.facilityRefresh?.call(null);
        }
    }

    public get showAtisInFacilityView() {
        return this.showAtisInFacilityView_;
    }
}
export default Cards;
