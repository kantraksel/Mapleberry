import { Feature } from 'ol';
import { FeatureLike } from 'ol/Feature';
import { MultiPolygon, Point } from 'ol/geom';

export interface AreaDesc {
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

    public set netId(id: number | undefined) {
        this.labels.forEach(label => {
            label.set('net_id_control', id, true);
        });
    }

    public static getNetId(feature: FeatureLike): number | null {
        const value = feature.get('net_id_control');
        if (typeof value !== 'number') {
            return null;
        }
        return value;
    }
}

export default MapArea;
