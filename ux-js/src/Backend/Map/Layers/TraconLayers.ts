import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Style as OlStyle, Fill as OlFill, Stroke as OlStroke } from 'ol/style';
import MapTracon from "../MapTracon";
import AreaLayers from "./AreaLayers";

class TraconLayers {
    public traconLayer: VectorLayer;
    private traconSource: VectorSource;
    private areaLayers: AreaLayers;

    public constructor(areaLayers: AreaLayers) {
        this.traconSource = new VectorSource();
        this.traconLayer = this.createAreaLayer(this.traconSource);
        this.areaLayers = areaLayers;
    }

    private createAreaLayer(source: VectorSource) {
        const shapeStyleObj = new OlStyle({
            fill: new OlFill({ color: [255, 0, 255, 0.2] }),
            stroke: new OlStroke({ color: [255, 0, 255] }),
        });
        return new VectorLayer({
            style: shapeStyleObj,
            source,
        });
    }

    public static get areaLabelStyle() {
        return AreaLayers.areaLabelStyle;
    }

    public addTracon(tracon: MapTracon) {
        tracon.area.set('ol_layer', this.traconLayer);
        this.traconSource.addFeature(tracon.area);
        if (tracon.label) {
            this.areaLayers.addLabel(tracon.label);
        }
    }

    public removeTracon(tracon: MapTracon) {
        this.traconSource.removeFeature(tracon.area);
        if (tracon.label) {
            this.areaLayers.removeLabel(tracon.label);
        }
    }
}
export default TraconLayers;
