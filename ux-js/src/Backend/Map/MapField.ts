import { Feature } from 'ol';
import { FeatureLike } from 'ol/Feature';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { AirportSpec } from '../NetworkUplink/Source/Objects/StationSpecs';
import NetworkField from '../NetworkUplink/Source/Objects/NetworkField';

class MapField {
    private pos: Point;
    public readonly point: Feature;
    public readonly label: Feature;

    public constructor(station: AirportSpec) {
        this.pos = new Point(fromLonLat([ station.longitude, station.latitude ]));
        this.point = new Feature(this.pos);
        this.label = new Feature(this.pos);

        this.point.set('station', station, true);
        this.label.set('station', station, true);
        this.setFilled();
    }

    public static getStation(feature: FeatureLike): AirportSpec | null {
        const value = feature.get('station');
        if (typeof value !== 'object') {
            return null;
        }
        return value;
    }

    public set netState(obj: NetworkField) {
        this.label.set('control_field_net_state', obj, true);
        this.point.set('control_field_net_state', obj, true);
    }

    public static getNetState(feature: FeatureLike): NetworkField | null {
        const value = feature.get('control_field_net_state') as unknown;
        if (typeof value !== 'object') {
            return null;
        }
        return value as NetworkField;
    }

    public setFilled() {
        this.point.setStyle(undefined);
        this.label.set('control_field_outlined', undefined);
        this.point.set('ol_z-index', 0, true);
        this.label.set('ol_z-index', 0, true);
    }

    public setOutlined() {
        this.point.setStyle(controlLayers.outlinedPointStyle);
        this.label.set('control_field_outlined', true);
        this.point.set('ol_z-index', -1, true);
        this.label.set('ol_z-index', -1, true);
    }

    public static getOutlined(feature: FeatureLike): boolean | undefined {
        return feature.get('control_field_outlined');
    }
}

export default MapField;
