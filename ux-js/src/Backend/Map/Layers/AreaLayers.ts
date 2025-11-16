import Feature, { FeatureLike } from "ol/Feature";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import MapArea from "../MapArea";
import { Style as OlStyle, Text as OlText, Fill as OlFill, Stroke as OlStroke } from 'ol/style';
import { StyleFunction } from "ol/style/Style";

class AreaLayers {
    public areaLayer: VectorLayer;
    private areaSource: VectorSource;
    public areaLabelLayer: VectorLayer;
    private areaLabelSource: VectorSource;

    public static areaLabelStyle?: StyleFunction;

    public constructor() {
        this.areaSource = new VectorSource();
        this.areaLabelSource = new VectorSource();

        this.areaLayer = this.createAreaLayer(this.areaSource);
        this.areaLabelLayer = this.createLabelLayer(this.areaLabelSource);
    }

    private createAreaLayer(source: VectorSource) {
        const areaStyle = new OlStyle({
            fill: new OlFill({ color: [255, 0, 0, 0.2] }),
            stroke: new OlStroke({ color: [255, 0, 0] }),
        });

        return new VectorLayer({
            style: areaStyle,
            source,
            updateWhileAnimating: true,
            updateWhileInteracting: true,
        });
    }

    private createLabelLayer(source: VectorSource) {
        const labelStyleObj = new OlStyle({
            text: new OlText({
                font: '18px "Cascadia Code"',
                fill: new OlFill({ color: [16, 16, 16] }),
                backgroundFill: new OlFill({ color: [0, 0, 0, 0.0001] }),
            }),
        });
        const labelStyle = (feature: FeatureLike, resolution: number) => {
            const refResolution = 4791;

            let labelRes = 1.0;
            if (resolution > refResolution) {
                const minResolution = 15105 - refResolution;
                labelRes -= Math.min(resolution - refResolution, minResolution) / minResolution * 0.4;
            }
            const text = labelStyleObj.getText()!;
            text.setScale(labelRes);

            const callsign = MapArea.getStationDesc(feature)?.icao ?? 'unknown';
            text.setText(callsign);

            labelStyleObj.setZIndex(0);
            return labelStyleObj;
        };
        AreaLayers.areaLabelStyle = labelStyle;

        return new VectorLayer({
            style: labelStyle,
            source,
            updateWhileAnimating: true,
        });
    }

    public addArea(area: MapArea) {
        area.area.set('ol_layer', this.areaLayer);
        this.areaSource.addFeature(area.area);
        area.labels.forEach(label => {
            label.set('ol_layer', this.areaLabelLayer);
            this.areaLabelSource.addFeature(label);
        });
    }

    public removeArea(area: MapArea) {
        this.areaSource.removeFeature(area.area);
        area.labels.forEach(label => {
            this.areaLabelSource.removeFeature(label);
        });
    }

    public addLabel(label: Feature) {
        label.set('ol_layer', this.areaLabelLayer);
        this.areaLabelSource.addFeature(label);
    }

    public removeLabel(label: Feature) {
        this.areaLabelSource.removeFeature(label);
    }
}
export default AreaLayers;
