import { Feature } from 'ol';
import { FeatureLike } from 'ol/Feature';
import { MultiPolygon, Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { Airport_ext, Tracon } from '../Network/ControlStations';
import { NetworkField } from '../Network/ControlRadar';

class MapTracon {
    public readonly area: Feature;
    public readonly substation: Tracon;

    private constructor(area: Feature, substation: Tracon) {
        this.area = area;
        this.substation = substation;
    }

    public static create(substation: Tracon, station: Airport_ext) {
        if (substation.geometry.length > 0) {
            const shape = new MultiPolygon(substation.geometry);
            const area = new Feature(shape);
            return new MapTracon(area, substation);
        } else {
            const pos = new Point(fromLonLat([ station.longitude, station.latitude ]));
            const area = new Feature(pos);
            area.set('control_tracon_default', true);
            return new MapTracon(area, substation);
        }
    }

    public static createStandalone(substation: Tracon) {
        const shape = new MultiPolygon(substation.geometry);
        const area = new Feature(shape);
        return new MapTracon(area, substation);
    }

    public set netState(obj: NetworkField) {
        this.area.set('control_field_net_state', obj, true);
    }

    public static getNetState(feature: FeatureLike): NetworkField | null {
        const value = feature.get('control_field_net_state') as unknown;
        if (typeof value !== 'object') {
            return null;
        }
        return value as NetworkField;
    }

    public static hasDefaultStyle(feature: FeatureLike): boolean | undefined {
        return feature.get('control_tracon_default');
    }
}

export default MapTracon;
