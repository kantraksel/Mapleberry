import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Style as OlStyle, Text as OlText, Fill as OlFill, Stroke as OlStroke, Icon as OlIcon } from 'ol/style';
import { FeatureLike } from "ol/Feature";
import MapPlane, { ActiveStyle } from "../MapPlane";

class LocalPlaneLayers {
    public pointLayer: VectorLayer;
    private pointSource: VectorSource;
    public labelLayer: VectorLayer;
    private labelSource: VectorSource;

    public static pointStyle = this.createPointStyle();
    public static labelStyle = this.createLabelStyle();

    public constructor() {
        this.pointSource = new VectorSource();
        this.labelSource = new VectorSource();

        this.pointLayer = this.createPointLayer();
        this.labelLayer = this.createLabelLayer();
    }

    private createPointLayer() {
        const iconSrc = '/flight_24dp_FFFFFF.svg';
        const pointStyle = new OlStyle({
            image: new OlIcon({
                src: iconSrc,
                color: [0, 138, 214],
            }),
            zIndex: 0,
        });
        const mainPointStyle = new OlStyle({
            image: new OlIcon({
                src: iconSrc,
                color: [200, 0, 0],
            }),
            zIndex: 1,
        });
        const selectedPointStyle = new OlStyle({
            image: new OlIcon({
                src: iconSrc,
                color: [168, 50, 255],
            }),
            zIndex: 2,
        });
        const styleFunction = (feature: FeatureLike) => {
            let style;
            switch (MapPlane.getRenderStyle(feature)) {
                case ActiveStyle.MainPoint: {
                    style = mainPointStyle;
                    break;
                }
                case ActiveStyle.SelectedPoint: {
                    style = selectedPointStyle;
                    break;
                }
                default: {
                    style = pointStyle;
                }
            }
            return LocalPlaneLayers.pointStyle(style, feature);
        };

        return new VectorLayer({
            style: styleFunction,
            source: this.pointSource,
            updateWhileAnimating: true,
            updateWhileInteracting: true,
        });
    }

    private static createLabelStyle() {
        const labelStyleObj = new OlStyle({
            text: new OlText({
                padding: [ 3, 1, 1, 5 ],
                font: '14px "Cascadia Code"',
                backgroundFill: new OlFill({ color: 'lightgray' }),
                backgroundStroke: new OlStroke({ color: 'black', width: 1 }),
            }),
        });
        return (feature: FeatureLike, resolution: number) => {
            if (resolution >= 1523 || !planeLayers.visible) {
                return undefined;
            }

            const textPart = labelStyleObj.getText()!;
            const callsign = MapPlane.getCallsign(feature) ?? '???';

            if (planeLayers.extendedLabels) {
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
    }

    private createLabelLayer() {
        const style = (feature: FeatureLike, resolution: number) => {
            const styleObj = LocalPlaneLayers.labelStyle(feature, resolution);
            if (!styleObj) {
                return styleObj;
            }
            switch (MapPlane.getRenderStyle(feature)) {
                case ActiveStyle.MainPoint: {
                    styleObj.setZIndex(1);
                    break;
                }
                case ActiveStyle.SelectedPoint: {
                    styleObj.setZIndex(2);
                    break;
                }
            }
            return styleObj;
        };

        return new VectorLayer({
            style: style,
            source: this.labelSource,
            updateWhileAnimating: true,
            updateWhileInteracting: true,
        });
    }

    private static createPointStyle() {
        const rotFactor = Math.PI / 180;
        return (style: OlStyle, feature: FeatureLike) => {
            if (!planeLayers.visible) {
                return undefined;
            }
            const params = MapPlane.getMotionState(feature);

            const rot = params ? params.heading * rotFactor : 0;
            style.getImage()!.setRotation(rot);
            return style;
        };
    }

    public addPlane(plane: MapPlane) {
        plane.point.set('ol_layer', this.pointLayer);
        this.pointSource.addFeature(plane.point);
        this.labelSource.addFeature(plane.point);
    }

    public removePlane(plane: MapPlane) {
        this.pointSource.removeFeature(plane.point);
        this.labelSource.removeFeature(plane.point);
    }
}
export default LocalPlaneLayers;
