import MapField from './../../../Map/MapField';
import { Airport_ext } from './NetDataExt';
import NetworkAtis from './NetworkAtis';
import NetworkController from './NetworkController';
import NetworkTracon from './NetworkTracon';
import RefObject from './RefObject';

class NetworkField extends RefObject {
    readonly icao: string;
    readonly field: MapField;
    tracons: NetworkTracon[];
    controllers: NetworkController[];
    atis: NetworkAtis[];
    readonly station: Airport_ext;
    isOutlined: boolean;

    constructor(station: Airport_ext) {
        super();
        this.field = new MapField(station);
        this.controllers = [];
        this.atis = [];
        this.station = station;
        this.icao = station.icao;
        this.isOutlined = false;
        this.tracons = [];

        this.field.netState = this;
    }

    setFill() {
        this.field.setFilled();
        this.isOutlined = false;
    }

    setOutline() {
        this.field.setOutlined();
        this.isOutlined = true;
    }
}
export default NetworkField;
