import { Feature } from 'ol';
import { FeatureLike } from 'ol/Feature';
import { MultiPolygon, Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { FIR_ext } from '../Network/ControlStations';

class MapArea {
    private shape: MultiPolygon;
    private pos: Point;
    public readonly area: Feature;
    public readonly label: Feature;

    public constructor(params: FIR_ext) {
        this.shape = new MultiPolygon(params.geometry);
        this.pos = new Point(fromLonLat([ params.label_lon, params.label_lat ]));
        this.area = new Feature(this.shape);
        this.label = new Feature(this.pos);

        this.area.set('params', params, true);
        this.label.set('params', params, true);
    }

    public static getParams(feature: FeatureLike): FIR_ext | null {
        const value = feature.get('params');
        if (typeof value !== 'object') {
            return null;
        }
        return value;
    }
}

export default MapArea;
