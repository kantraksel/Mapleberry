import { Feature } from 'ol';
import { FeatureLike } from 'ol/Feature';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { Airport_ext } from '../Network/ControlStations';
import { VatsimField } from '../Network/ControlRadar';

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

    public set netState(obj: VatsimField) {
        this.label.set('control_field_net_state', obj, true);
        this.point.set('control_field_net_state', obj, true);
    }

    public static getNetState(feature: FeatureLike): VatsimField | null {
        const value = feature.get('control_field_net_state') as unknown;
        if (typeof value !== 'object') {
            return null;
        }
        return value as VatsimField;
    }
}

export default MapField;
