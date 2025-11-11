import { Atis } from './LiveNetworkData';
import NetworkField from './NetworkField';
import RefObject from './RefObject';

class NetworkAtis extends RefObject {
    readonly station: NetworkField;
    data: Atis;

    constructor(data: Atis, station: NetworkField) {
        super();
        this.data = data;
        this.station = station;
    }

    addRef() {
        this.refCount++;
        this.station.addRef();
    }
}
export default NetworkAtis;
