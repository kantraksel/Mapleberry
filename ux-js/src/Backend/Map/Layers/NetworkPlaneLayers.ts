import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Style as OlStyle, Icon as OlIcon } from 'ol/style';
import MapPlane from "../MapPlane";
import LocalPlaneLayers from "./LocalPlaneLayers";

class NetworkPlaneLayers {
    public pointLayer: VectorLayer;
    private pointSource: VectorSource;
    public labelLayer: VectorLayer;
    private labelSource: VectorSource;

    public constructor() {
        this.pointSource = new VectorSource();
        this.labelSource = new VectorSource();

        this.pointLayer = this.createPointLayer();
        this.labelLayer = this.createLabelLayer();
    }

    private createPointLayer() {
        const pointStyle = LocalPlaneLayers.planeStyle(new OlStyle({
            image: new OlIcon({
                src: '/flight_24dp_FFFFFF.svg',
                color: [0, 0, 170],
            }),
        }));

        return new VectorLayer({
            style: pointStyle,
            source: this.pointSource,
        });
    }

    private createLabelLayer() {
        return new VectorLayer({
            style: LocalPlaneLayers.labelStyle,
            source: this.labelSource,
        });
    }

    public addPlane(plane: MapPlane) {
        plane.point.set('ol_layer', this.pointLayer);
        plane.label.set('ol_layer', this.labelLayer);
        this.pointSource.addFeature(plane.point);
        this.labelSource.addFeature(plane.label);
    }

    public removePlane(plane: MapPlane) {
        this.pointSource.removeFeature(plane.point);
        this.labelSource.removeFeature(plane.label);
    }
}
export default NetworkPlaneLayers;
