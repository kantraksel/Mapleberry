import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { FeatureLike } from 'ol/Feature';
import { StyleLike } from 'ol/style/Style';
import { Style as OlStyle, Text as OlText, Fill as OlFill, Stroke as OlStroke, Icon as OlIcon } from 'ol/style';
import MapPlane from './MapPlane';

class PlaneLayers {
    private pointLayer: VectorLayer;
    private pointSource: VectorSource;
    private labelLayer: VectorLayer;
    private labelSource: VectorSource;
    private farPointLayer: VectorLayer;
    private farPointSource: VectorSource;
    private farLabelLayer: VectorLayer;
    private farLabelSource: VectorSource;
    
    public readonly mainPointStyle: StyleLike;
    public readonly mainLabelStyle: StyleLike;
    public readonly selectedPointStyle: StyleLike;
    public readonly selectedLabelStyle: StyleLike;

    private extendedLabels: boolean;

    public constructor() {
        this.extendedLabels = false;

        const pointIconSrc = '/flight_24dp_FFFFFF.svg';
        const pointStyle = this.planeStyle(new OlStyle({
            image: new OlIcon({
                src: pointIconSrc,
                color: [0, 138, 214],
            }),
        }));
        const labelStyle = this.planeLabelStyle(new OlStyle({
            text: new OlText({
                padding: [ 3, 1, 1, 5 ],
                font: '14px "Cascadia Code"',
                backgroundFill: new OlFill({ color: 'lightgray' }),
                backgroundStroke: new OlStroke({ color: 'black', width: 1 }),
            }),
        }));

        this.mainPointStyle = this.planeStyle(new OlStyle({
            image: new OlIcon({
                src: pointIconSrc,
                color: [200, 0, 0],
            }),
            zIndex: 1,
        }));
        this.mainLabelStyle = (feature: FeatureLike, resolution: number) => {
            const style = labelStyle(feature, resolution);
            style?.setZIndex(1);
            return style;
        };

        this.selectedPointStyle = this.planeStyle(new OlStyle({
            image: new OlIcon({
                src: pointIconSrc,
                color: [168, 50, 255],
            }),
            zIndex: 2,
        }));
        this.selectedLabelStyle = (feature: FeatureLike, resolution: number) => {
            const style = labelStyle(feature, resolution);
            style?.setZIndex(2);
            return style;
        };

        const farPointStyle = this.planeStyle(new OlStyle({
            image: new OlIcon({
                src: pointIconSrc,
                color: [0, 0, 170],
            }),
        }));

        this.pointSource = new VectorSource();
        this.labelSource = new VectorSource();
        this.farPointSource = new VectorSource();
        this.farLabelSource = new VectorSource();
        this.pointLayer = new VectorLayer({
            style: pointStyle,
            source: this.pointSource,
            updateWhileAnimating: true,
            updateWhileInteracting: true,
        });
        this.labelLayer = new VectorLayer({
            style: labelStyle,
            source: this.labelSource,
            updateWhileAnimating: true,
            updateWhileInteracting: true,
        });
        this.farPointLayer = new VectorLayer({
            style: farPointStyle,
            source: this.farPointSource,
        });
        this.farLabelLayer = new VectorLayer({
            style: labelStyle,
            source: this.farLabelSource,
        });
    }

    public setupLayers() {
        const map = window.map.map;
        map.addLayer(this.farPointLayer);
        map.addLayer(this.pointLayer);
        map.addLayer(this.farLabelLayer);
        map.addLayer(this.labelLayer);
    }

    public addPlane(plane: MapPlane) {
        this.pointSource.addFeature(plane.point);
        this.labelSource.addFeature(plane.label);
    }

    public removePlane(plane: MapPlane) {
        this.pointSource.removeFeature(plane.point);
        this.labelSource.removeFeature(plane.label);
    }

    public addFarPlane(plane: MapPlane) {
        this.farPointSource.addFeature(plane.point);
        this.farLabelSource.addFeature(plane.label);
    }

    public removeFarPlane(plane: MapPlane) {
        this.farPointSource.removeFeature(plane.point);
        this.farLabelSource.removeFeature(plane.label);
    }

    public setExtendedLabels(value: boolean) {
        this.extendedLabels = value;
        this.farLabelLayer.changed();
        this.labelLayer.changed();
    }

    private planeLabelStyle(style: OlStyle) {
        return (feature: FeatureLike, resolution: number) => {
            if (resolution >= 1523) {
                return undefined;
            }

            const textPart = style.getText()!;
            const callsign = MapPlane.getCallsign(feature) ?? '???';

            if (this.extendedLabels) {
                const params = MapPlane.getParams(feature);
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

            style.setZIndex(0);
            return style;
        };
    }

    private planeStyle(style: OlStyle) {
        const rotFactor = Math.PI / 180;
        return (feature: FeatureLike) => {
            const params = MapPlane.getParams(feature);

            const rot = params ? params.heading * rotFactor : 0;
            style.getImage()!.setRotation(rot);
            return style;
        };
    }
}

export default PlaneLayers;
