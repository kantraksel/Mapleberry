import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { FeatureLike } from 'ol/Feature';
import { Style as OlStyle, Text as OlText, Fill as OlFill, Stroke as OlStroke, Circle as OlCircle } from 'ol/style';
import MapField from './MapField';
import MapArea from './MapArea';

class ControlLayer {
    private fieldLayer: VectorLayer;
    private fieldSource: VectorSource;
    private areaLayer: VectorLayer;
    private areaSource: VectorSource;
    private labelLayer: VectorLayer;
    private labelSource: VectorSource;

    public constructor() {
        const pointStyle = new OlStyle({
            image: new OlCircle({
                radius: 5,
                fill: new OlFill({
                    color: '#222222',
                }),
            }),
        });
        const labelStyle = new OlStyle({
            text: new OlText({
                padding: [ 3, 3, 3, 7], // top, right, bottom, left
                offsetY: -20,
                font: '14px cascadia-code',
                backgroundFill: new OlFill({
                    color: 'lightgray',
                }),
                backgroundStroke: new OlStroke({
                    color: 'black',
                    width: 1,
                }),
                textAlign: 'center',
            }),
        });

        this.fieldSource = new VectorSource();
        this.areaSource = new VectorSource();
        this.labelSource = new VectorSource();
        this.fieldLayer = new VectorLayer({
            style: pointStyle,
            source: this.fieldSource,
        });
        this.areaLayer = new VectorLayer({
            style: new OlStyle({
                fill: new OlFill({
                    color: [0, 255, 0, 0.2],
                }),
                stroke: new OlStroke({
                    color: '#FF0000',
                }),
            }),
            source: this.areaSource,
        });
        this.labelLayer = new VectorLayer({
            style: this.createLabelLayerStyle(labelStyle),
            source: this.labelSource,
        });

        map.map.addLayer(this.areaLayer);
        map.map.addLayer(this.fieldLayer);
        map.map.addLayer(this.labelLayer);
    }

    private createLabelLayerStyle(base: OlStyle) {
        return (feature: FeatureLike) => {
            const style = base.clone();

            const callsign = MapField.getParams(feature)?.icao ?? 'unknown';

            style.getText()!.setText(callsign);
            return style;
        };
    }

    public addField(field: MapField) {
        this.fieldSource.addFeature(field.point);
        this.labelSource.addFeature(field.label);
    }

    public removeField(field: MapField) {
        this.fieldSource.removeFeature(field.point);
        this.labelSource.removeFeature(field.label);
    }

    public addArea(area: MapArea) {
        this.areaSource.addFeature(area.area);
        this.labelSource.addFeature(area.label);
    }

    public removeArea(area: MapArea) {
        this.areaSource.removeFeature(area.area);
        this.labelSource.removeFeature(area.label);
    }
}

export default ControlLayer;
