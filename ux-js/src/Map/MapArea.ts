import { Feature } from 'ol';
import { FeatureLike } from 'ol/Feature';
import { MultiPolygon, Point } from 'ol/geom';

interface AreaDesc {
    icao: string,
    name: string,
    label_pos: number[];
    geometry: number[][][][],
}

class MapArea {
    public readonly area: Feature;
    public readonly label: Feature;

    public constructor(params: AreaDesc) {
        const shape = new MultiPolygon(params.geometry);
        const pos = new Point(params.label_pos);
        this.area = new Feature(shape);
        this.label = new Feature(pos);

        this.label.set('params', params, true);
    }

    public static getParams(feature: FeatureLike): AreaDesc | null {
        const value = feature.get('params') as unknown;
        if (typeof value !== 'object') {
            return null;
        }
        return value as AreaDesc;
    }
}

export default MapArea;
