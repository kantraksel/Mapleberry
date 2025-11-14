import MapTracon from './../../../Map/MapTracon';
import { Controller } from './LiveNetworkData';
import { TraconSpec } from './StationSpecs';
import NetworkControl from './NetworkControl';
import NetworkField from './NetworkField';
import NetworkTracon from './NetworkTracon';
import RefObject from './RefObject';

class NetworkController extends RefObject {
    readonly station?: NetworkControl;
    substation?: NetworkTracon;
    data: Controller;

    constructor(data: Controller, station: NetworkControl | undefined) {
        super();
        this.data = data;
        this.station = station;
    }

    addTracon(tracon: TraconSpec, sid: string) {
        if (this.station instanceof NetworkField) {
            this.substation = new NetworkTracon(MapTracon.create(tracon, this.station.station));
        } else {
            this.substation = new NetworkTracon(MapTracon.createStandalone(tracon, sid));
        }
        return this.substation;
    }

    isEqual(other: Controller) {
        const data = this.data;
        return data.cid === other.cid && data.callsign === other.callsign;
    }

    addRef() {
        this.refCount++;
        this.station?.addRef();
        this.substation?.addRef();
    }
}
export default NetworkController;
