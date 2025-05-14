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
    
    public readonly mainPointStyle: StyleLike;
    public readonly mainLabelStyle: StyleLike;

    public constructor() {
        const pointStyle = new OlStyle({
            image: new OlIcon({
                src: '/flight_24dp_FFFFFF.svg',
                color: '#0000AA',
            }),
        });
        const labelStyle = new OlStyle({
            text: new OlText({
                padding: [ 3, 3, 3, 7], // top, right, bottom, left
                offsetY: -30, // one-liner: -20
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
        this.mainPointStyle = this.createPointLayerStyle(new OlStyle({
            image: new OlIcon({
                src: '/flight_24dp_FFFFFF.svg',
                color: '#AA0000',
            }),
            zIndex: 1,
        }));
        const mainLabelStyle = labelStyle.clone();
        mainLabelStyle.setZIndex(1);
        this.mainLabelStyle = this.createLabelLayerStyle(mainLabelStyle);

        this.pointSource = new VectorSource();
        this.labelSource = new VectorSource();
        this.pointLayer = new VectorLayer({
            style: this.createPointLayerStyle(pointStyle),
            source: this.pointSource,
        });
        this.labelLayer = new VectorLayer({
            style: this.createLabelLayerStyle(labelStyle),
            source: this.labelSource,
        });

        map.map.addLayer(this.pointLayer);
        map.map.addLayer(this.labelLayer);
    }

    public addPlane(plane: MapPlane) {
        this.pointSource.addFeature(plane.point);
        this.labelSource.addFeature(plane.label);
    }

    public removePlane(plane: MapPlane) {
        this.pointSource.removeFeature(plane.point);
        this.labelSource.removeFeature(plane.label);
    }

    private createLabelLayerStyle(base: OlStyle) {
        return (feature: FeatureLike) => {
            const style = base.clone();
            const params = MapPlane.getParams(feature);

            let callsign = MapPlane.getCallsign(feature) ?? '#UFO';
            let altitude = params ? Math.round(params.altitude) : '-';
            let speed = params ? Math.round(params.groundSpeed) : '-';

            const str = `${callsign}\n${altitude}ft ${speed}kts`;
            style.getText()!.setText(str);
            return style;
        };
    }

    private createPointLayerStyle(base: OlStyle) {
        return (feature: FeatureLike) => {
            const style = base.clone();
            const params = MapPlane.getParams(feature);

            const rot = params ? params.heading * (Math.PI / 180) : 0;
            style.getImage()!.setRotation(rot);
            return style;
        };
    }
}

export default PlaneLayers;
