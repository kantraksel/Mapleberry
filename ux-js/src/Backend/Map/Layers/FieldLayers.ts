import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import MapField from "../MapField";
import { FeatureLike } from "ol/Feature";
import { Style as OlStyle, Text as OlText, Fill as OlFill, Stroke as OlStroke, Circle as OlCircle } from 'ol/style';
import { StyleLike } from "ol/style/Style";

class FieldLayers {
    public fieldLayer: VectorLayer;
    private fieldSource: VectorSource;
    public fieldLabelLayer: VectorLayer;
    private fieldLabelSource: VectorSource;

    public static outlinedPointStyle?: StyleLike;

    public constructor() {
        this.fieldSource = new VectorSource();
        this.fieldLabelSource = new VectorSource();

        this.fieldLayer = this.createPointLayer();
        this.fieldLabelLayer = this.createLabelLayer();
    }

    private createPointLayer() {
        const filledPointStyle = new OlStyle({
            image: new OlCircle({
                radius: 5,
                fill: new OlFill({ color: [135, 58, 235] }),
            }),
            zIndex: 0,
        });
        FieldLayers.outlinedPointStyle = new OlStyle({
            image: new OlCircle({
                radius: 5,
                fill: new OlFill({ color: [1, 1, 1, 0.01] }),
                stroke: new OlStroke({ color: [135, 58, 235], width: 3 }),
            }),
            zIndex: -1,
        });

        return new VectorLayer({
            style: filledPointStyle,
            source: this.fieldSource,
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

        return new VectorLayer({
            style: labelStyle,
            source: this.fieldLabelSource,
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
}
export default FieldLayers;
