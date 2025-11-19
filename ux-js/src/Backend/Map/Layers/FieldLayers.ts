import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import MapField from "../MapField";
import { FeatureLike } from "ol/Feature";
import { Style as OlStyle, Text as OlText, Fill as OlFill, Stroke as OlStroke, Circle as OlCircle } from 'ol/style';

class FieldLayers {
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
        const filledPointStyle = new OlStyle({
            image: new OlCircle({
                radius: 5,
                fill: new OlFill({ color: [135, 58, 235] }),
            }),
            zIndex: 0,
        });
        const outlinedPointStyle = new OlStyle({
            image: new OlCircle({
                radius: 5,
                fill: new OlFill({ color: [1, 1, 1, 0.01] }),
                stroke: new OlStroke({ color: [135, 58, 235], width: 3 }),
            }),
            zIndex: -1,
        });
        const styleFunction = (feature: FeatureLike) => {
            if (MapField.getOutlined(feature)) {
                if (!controlLayers.atisFields) {
                    return undefined;
                }
                return outlinedPointStyle;
            } else {
                return filledPointStyle;
            }
        };

        return new VectorLayer({
            style: styleFunction,
            source: this.pointSource,
        });
    }

    private createLabelLayer() {
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
            const outlined = MapField.getOutlined(feature);
            if (outlined && !controlLayers.atisFields) {
                return undefined;
            }

            const station = MapField.getStation(feature);
            let callsign;
            if (station) {
                if (controlLayers.useLID && station.aliases.length > 0) {
                    callsign = station.aliases[0].iata_lid;
                } else {
                    callsign = station.icao;
                }
            } else {
                callsign = 'unknown';
            }
            
            const text = labelStyleObj.getText()!;
            text.setText(callsign);
            if (outlined) {
                text.setFont('italic 14px "Cascadia Code"');
                labelStyleObj.setZIndex(-1);
            } else {
                text.setFont('14px "Cascadia Code"');
                labelStyleObj.setZIndex(0);
            }
            return labelStyleObj;
        };

        return new VectorLayer({
            style: labelStyle,
            source: this.labelSource,
        });
    }

    public addField(field: MapField) {
        field.point.set('ol_layer', this.pointLayer);
        this.pointSource.addFeature(field.point);
        this.labelSource.addFeature(field.point);
    }

    public removeField(field: MapField) {
        this.pointSource.removeFeature(field.point);
        this.labelSource.removeFeature(field.point);
    }
}
export default FieldLayers;
