import MapPlane from './MapPlane';
import LocalPlaneLayers from './Layers/LocalPlaneLayers';
import NetworkPlaneLayers from './Layers/NetworkPlaneLayers';

class PlaneLayers {
    private localLayers: LocalPlaneLayers;
    private networkLayers: NetworkPlaneLayers;

    public static extendedLabels: boolean = false;

    public constructor() {
        this.localLayers = new LocalPlaneLayers();
        this.networkLayers = new NetworkPlaneLayers();
    }

    public setupLayers() {
        const map = window.map.map;
        map.addLayer(this.networkLayers.pointLayer);
        map.addLayer(this.localLayers.pointLayer);
        map.addLayer(this.networkLayers.labelLayer);
        map.addLayer(this.localLayers.labelLayer);
    }

    public addPlane(plane: MapPlane) {
        this.localLayers.addPlane(plane);
    }

    public removePlane(plane: MapPlane) {
        this.localLayers.removePlane(plane);
    }

    public addFarPlane(plane: MapPlane) {
        this.networkLayers.addPlane(plane);
    }

    public removeFarPlane(plane: MapPlane) {
        this.networkLayers.removePlane(plane);
    }

    public setExtendedLabels(value: boolean) {
        PlaneLayers.extendedLabels = value;
        this.networkLayers.labelLayer.changed();
        this.localLayers.labelLayer.changed();
    }
}
export default PlaneLayers;
