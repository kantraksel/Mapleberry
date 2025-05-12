import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapLayers } from './GlobalMap';
import { PhysicParams } from './PlaneRadar';

class MapPlane {
    private point: Point;
    private dot: Feature;
    private label: Feature;

    public constructor() {
        this.point = new Point([ 0, 0 ]);
        this.dot = new Feature(this.point);
        this.label = new Feature(this.point);
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
        this.label.set('callsign', callsign);
    }

    public setParams(params: PhysicParams) {
        this.point.setCoordinates(fromLonLat([ params.longitude, params.latitude ]));

        const rad = params.heading * (Math.PI / 180);
        this.dot.set('hdg_rad', rad);

        this.label.set('params', params);
    }

    public setUserStyle(user: boolean) {
        let dotStyle;
        let labelStyle;
        if (user) {
            dotStyle = map.mainPointLayerStyle;
            labelStyle = map.mainLabelLayerStyle;
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
