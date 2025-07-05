import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { FeatureLike } from 'ol/Feature';
import { Style as OlStyle, Text as OlText, Fill as OlFill, Stroke as OlStroke, Circle as OlCircle } from 'ol/style';
import MapField from './MapField';
import MapArea from './MapArea';

class ControlLayer {
    private fieldLayer?: VectorLayer;
    private fieldSource: VectorSource;
    private fieldLabelLayer?: VectorLayer;
    private fieldLabelSource: VectorSource;
    private areaLayer?: VectorLayer;
    private areaSource: VectorSource;
    private areaLabelLayer?: VectorLayer;
    private areaLabelSource: VectorSource;

    public constructor() {
        this.fieldSource = new VectorSource();
        this.fieldLabelSource = new VectorSource();
        this.areaSource = new VectorSource();
        this.areaLabelSource = new VectorSource();

        this.createAreaLayers();
        this.createFieldLayers();

        const map = window.map.map;
        map.addLayer(this.areaLayer!);
        map.addLayer(this.fieldLayer!);
        map.addLayer(this.areaLabelLayer!);
        map.addLayer(this.fieldLabelLayer!);
    }

    private createFieldLayers() {
        const pointStyle = new OlStyle({
            image: new OlCircle({
                radius: 5,
                fill: new OlFill({ color: [135, 58, 235] }),
            }),
        });
        const labelStyleObj = new OlStyle({
            text: new OlText({
                padding: [ 3, 1, 1, 4 ],
                offsetY: -16,
                font: '14px "Cascadia Code"',
                backgroundFill: new OlFill({ color: [228, 228, 228] }),
                backgroundStroke: new OlStroke({ color: 'black', width: 1 }),
            }),
        });
        const labelStyle = (feature: FeatureLike, resolution: number) => {
            if (resolution >= 4791) {
                return undefined;
            }

            const callsign = MapField.getParams(feature)?.icao ?? 'unknown';
            labelStyleObj.getText()!.setText(callsign);
            return labelStyleObj;
        };

        this.fieldLayer = new VectorLayer({
            style: pointStyle,
            source: this.fieldSource,
        });
        this.fieldLabelLayer = new VectorLayer({
            style: labelStyle,
            source: this.fieldLabelSource,
        });
    }

    private createAreaLayers() {
        const areaStyle = new OlStyle({
            fill: new OlFill({ color: [255, 0, 0, 0.2] }),
            stroke: new OlStroke({ color: [255, 0, 0] }),
        });
        const labelStyleObj = new OlStyle({
            text: new OlText({
                font: '18px "Cascadia Code"',
                fill: new OlFill({ color: [16, 16, 16] }),
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

            const callsign = MapArea.getParams(feature)?.icao ?? 'unknown';
            text.setText(callsign);
            return labelStyleObj;
        };

        this.areaLayer = new VectorLayer({
            style: areaStyle,
            source: this.areaSource,
        });
        this.areaLabelLayer = new VectorLayer({
            style: labelStyle,
            source: this.areaLabelSource,
            updateWhileAnimating: true,
        });
    }

    public addField(field: MapField) {
        this.fieldSource.addFeature(field.point);
        this.fieldLabelSource.addFeature(field.label);
    }

    public removeField(field: MapField) {
        this.fieldSource.removeFeature(field.point);
        this.fieldLabelSource.removeFeature(field.label);
    }

    public addArea(area: MapArea) {
        this.areaSource.addFeature(area.area);
        this.areaLabelSource.addFeature(area.label);
    }

    public removeArea(area: MapArea) {
        this.areaSource.removeFeature(area.area);
        this.areaLabelSource.removeFeature(area.label);
    }
}

export default ControlLayer;
