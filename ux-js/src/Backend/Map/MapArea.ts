import { Feature } from 'ol';
import { FeatureLike } from 'ol/Feature';
import { MultiPolygon, Point } from 'ol/geom';
import NetworkArea from '../NetworkUplink/Source/Objects/NetworkArea';
import { fromLonLat } from 'ol/proj';

export interface StationDesc {
    icao: string,
    name: string,
    label_pos?: number[];
    labels_pos?: number[][];
    geometry: number[][][][],
}

class MapArea {
    public readonly area: Feature;
    public readonly labels: Feature[];

    public constructor(desc: StationDesc) {
        const shape = new MultiPolygon(desc.geometry);
        this.area = new Feature(shape);

        this.labels = [];
        const labels_pos = desc.labels_pos ?? [];
        if (desc.label_pos) {
            labels_pos.push(desc.label_pos);
        }

        labels_pos.forEach(label_pos => {
            const pos = new Point(fromLonLat(label_pos));
            const label = new Feature(pos);
            label.set('station_desc', desc, true);
            label.set('ol_z-index', 0, true);
            this.labels.push(label);
        });

        this.area.set('cards_ignore', true, true);
    }

    public static getStationDesc(feature: FeatureLike) {
        const value = feature.get('station_desc') as unknown;
        if (typeof value !== 'object') {
            return null;
        }
        return value as StationDesc;
    }

    public set netState(obj: NetworkArea) {
        this.labels.forEach(label => {
            label.set('control_area_net_state', obj, true);
        });
    }

    public static getNetState(feature: FeatureLike): NetworkArea | null {
        const value = feature.get('control_area_net_state') as unknown;
        if (typeof value !== 'object') {
            return null;
        }
        return value as NetworkArea;
    }
}

export default MapArea;
