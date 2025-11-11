import MapArea, { StationDesc } from '../../../Map/MapArea';
import NetworkController from './NetworkController';
import RefObject from './RefObject';

class NetworkArea extends RefObject {
    readonly icao: string;
    readonly area: MapArea;
    controllers: NetworkController[];
    readonly station: StationDesc;

    constructor(desc: StationDesc) {
        super();
        this.area = new MapArea(desc);
        this.controllers = [];
        this.station = desc;
        this.icao = desc.icao;

        this.area.netState = this;
    }
}
export default NetworkArea;
