import { Feature } from 'ol';
import { FeatureLike } from 'ol/Feature';
import { MultiPolygon, Point } from 'ol/geom';

interface AreaDesc {
    icao: string,
    name: string,
    label_pos?: number[];
    labels_pos?: number[][];
    geometry: number[][][][],
}

class MapArea {
    public readonly area: Feature;
    public readonly labels: Feature[];

    public constructor(params: AreaDesc) {
        const shape = new MultiPolygon(params.geometry);
        this.area = new Feature(shape);

        this.labels = [];
        const labels_pos = params.labels_pos ?? [];
        if (params.label_pos) {
            labels_pos.push(params.label_pos);
        }

        labels_pos.forEach(label_pos => {
            const pos = new Point(label_pos);
            const label = new Feature(pos);
            label.set('params', params, true);
            this.labels.push(label);
        });
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
