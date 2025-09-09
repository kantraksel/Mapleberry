import { Feature } from 'ol';
import { FeatureLike } from 'ol/Feature';
import { MultiPolygon, Point } from 'ol/geom';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Airport_ext, Tracon } from '../Network/ControlStations';
import { NetworkTracon } from '../Network/ControlRadar';
import polylabel from 'polylabel';
import Style from 'ol/style/Style';

class MapTracon {
    public readonly area: Feature;
    public readonly label?: Feature;
    public readonly substation: Tracon;

    private constructor(area: Feature, substation: Tracon, tracon?: Feature) {
        this.area = area;
        this.substation = substation;
        this.label = tracon;

        this.area.set('cards_ignore', true, true);
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

    public static createStandalone(substation: Tracon, sid: string) {
        const label_pos = polylabel(substation.geometry[0]);

        const shape = new MultiPolygon(substation.geometry);
        const pos = new Point(label_pos);
        const area = new Feature(shape);
        const label = new Feature(pos);

        label.setStyle((feature: FeatureLike, resolution: number) => {
            const obj = controlLayers.areaLabelStyle!(feature, resolution) as Style;
            obj.setZIndex(1);
            return obj;
        });
        label.set('ol_z-index', 1, true);
        label.set('station_desc', { icao: sid });
        return new MapTracon(area, substation, label);
    }

    public set netState(obj: NetworkTracon) {
        this.label?.set('control_tracon_net_state', obj, true);
    }

    public static getNetState(feature: FeatureLike): NetworkTracon | null {
        const value = feature.get('control_tracon_net_state') as unknown;
        if (typeof value !== 'object') {
            return null;
        }
        return value as NetworkTracon;
    }

    public static hasDefaultStyle(feature: FeatureLike): boolean | undefined {
        return feature.get('control_tracon_default');
    }

    public getLabelPos() {
        const point = this.label?.getGeometry() as Point | undefined;
        if (!point) {
            return null;
        }
        return toLonLat(point.getCoordinates());
    }
}

export default MapTracon;
