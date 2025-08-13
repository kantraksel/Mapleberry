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

    public constructor(station: Airport_ext) {
        this.pos = new Point(fromLonLat([ station.longitude, station.latitude ]));
        this.point = new Feature(this.pos);
        this.label = new Feature(this.pos);

        this.point.set('station', station, true);
        this.label.set('station', station, true);
    }

    public static getStation(feature: FeatureLike): Airport_ext | null {
        const value = feature.get('station');
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

    public setFilled() {
        this.point.setStyle(undefined);
        this.label.set('control_field_outlined', undefined);
    }

    public setOutlined() {
        this.point.setStyle(controlLayers.outlinedPointStyle);
        this.label.set('control_field_outlined', true);
    }

    public static getOutlined(feature: FeatureLike): boolean | undefined {
        return feature.get('control_field_outlined');
    }
}

export default MapField;
