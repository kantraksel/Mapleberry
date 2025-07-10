import { Feature } from 'ol';
import { FeatureLike } from 'ol/Feature';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { Airport_ext } from '../Network/ControlStations';

class MapField {
    private pos: Point;
    public readonly point: Feature;
    public readonly label: Feature;

    public constructor(params: Airport_ext) {
        this.pos = new Point(fromLonLat([ params.longitude, params.latitude ]));
        this.point = new Feature(this.pos);
        this.label = new Feature(this.pos);

        this.point.set('params', params, true);
        this.label.set('params', params, true);
    }

    public set params(params: Airport_ext) {
        this.pos.setCoordinates(fromLonLat([ params.longitude, params.latitude ]));
        this.point.set('params', params, true);
        this.label.set('params', params);
    }

    public static getParams(feature: FeatureLike): Airport_ext | null {
        const value = feature.get('params');
        if (typeof value !== 'object') {
            return null;
        }
        return value;
    }

    public set netId(id: number | undefined) {
        this.label.set('net_id_control', id, true);
        this.point.set('net_id_control', id, true);
    }

    public static getNetId(feature: FeatureLike): number | null {
        const value = feature.get('net_id_control');
        if (typeof value !== 'number') {
            return null;
        }
        return value;
    }
}

export default MapField;
