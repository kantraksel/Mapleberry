import MapPlane from './MapPlane';
import LocalPlaneLayers from './Layers/LocalPlaneLayers';
import NetworkPlaneLayers from './Layers/NetworkPlaneLayers';

class PlaneLayers {
    private localLayers: LocalPlaneLayers;
    private networkLayers: NetworkPlaneLayers;

    private extendedLabels_: boolean;
    private visible_: boolean;

    public constructor() {
        this.extendedLabels_ = false;
        this.visible_ = true;

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

    public set extendedLabels(value: boolean) {
        this.extendedLabels_ = value;
        this.networkLayers.labelLayer.changed();
        this.localLayers.labelLayer.changed();
    }

    public get extendedLabels() {
        return this.extendedLabels_;
    }

    public set visible(value: boolean) {
        this.visible_ = value;
        this.networkLayers.labelLayer.changed();
        this.networkLayers.pointLayer.changed();
        this.localLayers.labelLayer.changed();
        this.localLayers.pointLayer.changed();
    }

    public get visible() {
        return this.visible_;
    }
}
export default PlaneLayers;
