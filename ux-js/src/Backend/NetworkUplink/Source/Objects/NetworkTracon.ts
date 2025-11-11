import MapTracon from './../../../Map/MapTracon';
import NetworkController from './NetworkController';
import RefObject from './RefObject';

export class NetworkTracon extends RefObject {
    readonly substation: MapTracon;
    controllers: NetworkController[];

    constructor(substation: MapTracon) {
        super();
        this.substation = substation;
        this.controllers = [];
        substation.netState = this;
    }
}
export default NetworkTracon;
