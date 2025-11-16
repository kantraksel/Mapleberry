import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { StyleFunction, StyleLike } from "ol/style/Style";
import { Style as OlStyle, Text as OlText, Fill as OlFill, Stroke as OlStroke, Icon as OlIcon } from 'ol/style';
import { FeatureLike } from "ol/Feature";
import MapPlane from "../MapPlane";
import PlaneLayers from "../PlaneLayers";

class LocalPlaneLayers {
    public pointLayer: VectorLayer;
    private pointSource: VectorSource;
    public labelLayer: VectorLayer;
    private labelSource: VectorSource;

    public static labelStyle?: StyleFunction;
    public static mainPointStyle?: StyleLike;
    public static mainLabelStyle?: StyleLike;
    public static selectedPointStyle?: StyleLike;
    public static selectedLabelStyle?: StyleLike;

    public constructor() {
        this.pointSource = new VectorSource();
        this.labelSource = new VectorSource();

        this.pointLayer = this.createPointLayer();
        this.labelLayer = this.createLabelLayer();
    }

    private createPointLayer() {
        const iconSrc = '/flight_24dp_FFFFFF.svg';
        const pointStyle = LocalPlaneLayers.planeStyle(new OlStyle({
            image: new OlIcon({
                src: iconSrc,
                color: [0, 138, 214],
            }),
            zIndex: 0,
        }));
        LocalPlaneLayers.mainPointStyle = LocalPlaneLayers.planeStyle(new OlStyle({
            image: new OlIcon({
                src: iconSrc,
                color: [200, 0, 0],
            }),
            zIndex: 1,
        }));
        LocalPlaneLayers.selectedPointStyle = LocalPlaneLayers.planeStyle(new OlStyle({
            image: new OlIcon({
                src: iconSrc,
                color: [168, 50, 255],
            }),
            zIndex: 2,
        }));

        return new VectorLayer({
            style: pointStyle,
            source: this.pointSource,
            updateWhileAnimating: true,
            updateWhileInteracting: true,
        });
    }

    private createLabelLayer() {
        const labelStyleObj = new OlStyle({
            text: new OlText({
                padding: [ 3, 1, 1, 5 ],
                font: '14px "Cascadia Code"',
                backgroundFill: new OlFill({ color: 'lightgray' }),
                backgroundStroke: new OlStroke({ color: 'black', width: 1 }),
            }),
        });
        const labelStyle = (feature: FeatureLike, resolution: number) => {
            if (resolution >= 1523) {
                return undefined;
            }

            const textPart = labelStyleObj.getText()!;
            const callsign = MapPlane.getCallsign(feature) ?? '???';

            if (PlaneLayers.extendedLabels) {
                const params = MapPlane.getMotionState(feature);
                let altitude: unknown = '-';
                let speed: unknown = '-';
                if (params) {
                    altitude = Math.round(params.altitude);
                    speed = Math.round(params.groundSpeed);
                }

                textPart.setText(`${callsign}\n${altitude}ft ${speed}kts`);
                textPart.setOffsetY(-30);
            } else {
                textPart.setText(callsign);
                textPart.setOffsetY(-20);
            }

            labelStyleObj.setZIndex(0);
            return labelStyleObj;
        };
        LocalPlaneLayers.labelStyle = labelStyle;
        LocalPlaneLayers.mainLabelStyle = (feature: FeatureLike, resolution: number) => {
            const style = labelStyle(feature, resolution);
            style?.setZIndex(1);
            return style;
        };
        LocalPlaneLayers.selectedLabelStyle = (feature: FeatureLike, resolution: number) => {
            const style = labelStyle(feature, resolution);
            style?.setZIndex(2);
            return style;
        };

        return new VectorLayer({
            style: labelStyle,
            source: this.labelSource,
            updateWhileAnimating: true,
            updateWhileInteracting: true,
        });
    }

    public static planeStyle(style: OlStyle) {
        const rotFactor = Math.PI / 180;
        return (feature: FeatureLike) => {
            const params = MapPlane.getMotionState(feature);

            const rot = params ? params.heading * rotFactor : 0;
            style.getImage()!.setRotation(rot);
            return style;
        };
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
export default LocalPlaneLayers;
