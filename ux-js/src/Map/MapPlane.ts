import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { flatStylesToStyleFunction } from 'ol/render/canvas/style';
import { MapLayers } from './GlobalMap';

interface Position {
    longitude: number;
    latitude: number;
    heading: number;
}

class MapPlane {
    private point: Point;
    private dot: Feature;
    private label: Feature;

    public constructor() {
        this.point = new Point([ 0, 0 ]);
        this.dot = new Feature(this.point);
        this.label = new Feature(this.point);

        this.label.set('callsign_text', '');
        this.dot.set('hdg_rad', 0);
    }

    public addToMap(map: MapLayers) {
        map.points.addFeature(this.dot);
        map.labels.addFeature(this.label);
    }

    public removeFromMap(map: MapLayers) {
        map.points.removeFeature(this.dot);
        map.labels.removeFeature(this.label);
    }

    public setCallsign(callsign: string) {
        this.label.set('callsign_text', callsign);
    }

    public setPosition(pos: Position) {
        this.point.setCoordinates(fromLonLat([ pos.longitude, pos.latitude ]));

        const rad = pos.heading * (Math.PI / 180);
        this.dot.set('hdg_rad', rad);
    }

    public setUserStyle(user: boolean) {
        let dotStyle;
        let labelStyle;
        if (user) {
            dotStyle = flatStylesToStyleFunction([
                {
                    ...map.pointLayerStyle,
                    'icon-color': '#AA0000',
                    'z-index': 1,
                }
            ]);
            labelStyle = flatStylesToStyleFunction([
                {
                    ...map.labelLayerStyle,
                    'z-index': 1,
                }
            ]);
        }
        this.dot.setStyle(dotStyle);
        this.label.setStyle(labelStyle);
    }

    public get userObject() {
        return this.dot.get('user_object');
    }

    public set userObject(object: unknown) {
        this.dot.set('user_object', object, true);
    }
}

export default MapPlane;
