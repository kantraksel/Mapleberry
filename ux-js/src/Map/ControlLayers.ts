import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { FeatureLike } from 'ol/Feature';
import { Style as OlStyle, Text as OlText, Fill as OlFill, Stroke as OlStroke, Circle as OlCircle } from 'ol/style';
import { StyleFunction, StyleLike } from 'ol/style/Style';
import MapField from './MapField';
import MapArea from './MapArea';
import MapTracon from './MapTracon';

class ControlLayer {
    private fieldLayer?: VectorLayer;
    private fieldSource: VectorSource;
    private fieldLabelLayer?: VectorLayer;
    private fieldLabelSource: VectorSource;
    private areaLayer?: VectorLayer;
    private areaSource: VectorSource;
    private areaLabelLayer?: VectorLayer;
    private areaLabelSource: VectorSource;
    private traconLayer?: VectorLayer;
    private traconSource: VectorSource;

    private readonly filledPointStyle: StyleLike;
    public readonly outlinedPointStyle: StyleLike;
    public areaLabelStyle?: StyleFunction;

    public constructor() {
        this.fieldSource = new VectorSource();
        this.fieldLabelSource = new VectorSource();
        this.areaSource = new VectorSource();
        this.areaLabelSource = new VectorSource();
        this.traconSource = new VectorSource();

        this.filledPointStyle = new OlStyle({
            image: new OlCircle({
                radius: 5,
                fill: new OlFill({ color: [135, 58, 235] }),
            }),
            zIndex: 0,
        });
        this.outlinedPointStyle = new OlStyle({
            image: new OlCircle({
                radius: 5,
                fill: new OlFill({ color: [1, 1, 1, 0.01] }),
                stroke: new OlStroke({ color: [135, 58, 235], width: 3 }),
            }),
            zIndex: -1,
        });

        this.createAreaLayers();
        this.createFieldLayers();
        this.createTraconLayers();
    }

    public setupLayers() {
        const map = window.map.map;
        map.addLayer(this.areaLayer!);
        map.addLayer(this.traconLayer!);
        map.addLayer(this.fieldLayer!);
    }

    public setupLabelLayers() {
        const map = window.map.map;
        map.addLayer(this.areaLabelLayer!);
        map.addLayer(this.fieldLabelLayer!);
    }

    private createFieldLayers() {
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

            const callsign = MapField.getStation(feature)?.icao ?? 'unknown';
            const text = labelStyleObj.getText()!;
            text.setText(callsign);
            if (MapField.getOutlined(feature)) {
                text.setFont('italic 14px "Cascadia Code"');
                labelStyleObj.setZIndex(-1);
            } else {
                text.setFont('14px "Cascadia Code"');
                labelStyleObj.setZIndex(0);
            }
            return labelStyleObj;
        };

        this.fieldLayer = new VectorLayer({
            style: this.filledPointStyle,
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

        this.areaLayer = new VectorLayer({
            style: areaStyle,
            source: this.areaSource,
        });
        this.areaLabelLayer = new VectorLayer({
            style: labelStyle,
            source: this.areaLabelSource,
            updateWhileAnimating: true,
        });

        this.areaLabelStyle = labelStyle;
    }

    private createTraconLayers() {
        const shapeStyleObj = new OlStyle({
            fill: new OlFill({ color: [255, 0, 255, 0.2] }),
            stroke: new OlStroke({ color: [255, 0, 255] }),
        });
        this.traconLayer = new VectorLayer({
            style: shapeStyleObj,
            source: this.traconSource,
        });
    }

    public addField(field: MapField) {
        field.point.set('ol_layer', this.fieldLayer);
        field.label.set('ol_layer', this.fieldLabelLayer);
        this.fieldSource.addFeature(field.point);
        this.fieldLabelSource.addFeature(field.label);
    }

    public removeField(field: MapField) {
        this.fieldSource.removeFeature(field.point);
        this.fieldLabelSource.removeFeature(field.label);
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

    public addTracon(tracon: MapTracon) {
        tracon.area.set('ol_layer', this.traconLayer);
        this.traconSource.addFeature(tracon.area);
        if (tracon.label) {
            tracon.label.set('ol_layer', this.areaLabelLayer);
            this.areaLabelSource.addFeature(tracon.label);
        }
    }

    public removeTracon(tracon: MapTracon) {
        this.traconSource.removeFeature(tracon.area);
        if (tracon.label) {
            this.areaLabelSource.removeFeature(tracon.label);
        }
    }
}

export default ControlLayer;
