import { Feature } from 'ol';
import { FeatureLike } from 'ol/Feature';
import { MultiPolygon, Point, Polygon } from 'ol/geom';
import { fromLonLat, toLonLat } from 'ol/proj';
import polylabel from 'polylabel';
import Style from 'ol/style/Style';
import { AirportSpec, TraconSpec } from '../NetworkUplink/Source/Objects/StationSpecs';
import NetworkTracon from '../NetworkUplink/Source/Objects/NetworkTracon';

function round(n: number) {
    return Math.round(n * 100) / 100;
}

function createCircle(center: number[]) {
    const nautic_mile_to_meter = 40000 / (360 * 60) * 1000;
    const radius = nautic_mile_to_meter * 50;
    const shape: [number, number][] = [];
    for (let i = 0; i < 360; ++i) {
        const angle = i * (Math.PI / 180);
        const x = round(center[0] + radius * Math.cos(angle));
        const y = round(center[1] + radius * Math.sin(angle));
        shape.push([ x, y ]);
    }
    return [ shape ];
}

class MapTracon {
    public readonly area: Feature;
    public readonly label?: Feature;
    public readonly substation: TraconSpec;

    private constructor(area: Feature, substation: TraconSpec, tracon?: Feature) {
        this.area = area;
        this.substation = substation;
        this.label = tracon;

        this.area.set('cards_ignore', true, true);
    }

    public static create(substation: TraconSpec, station: AirportSpec) {
        let shape;
        if (substation.geometry.length > 0) {
            shape = new MultiPolygon(substation.geometry);
        } else {
            const pos = fromLonLat([ station.longitude, station.latitude ]);
            shape = new Polygon(createCircle(pos));
        }
        const area = new Feature(shape);
        return new MapTracon(area, substation);
    }

    public static createStandalone(substation: TraconSpec, sid: string) {
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

    public getLabelPos() {
        const point = this.label?.getGeometry() as Point | undefined;
        if (!point) {
            return null;
        }
        return toLonLat(point.getCoordinates());
    }
}

export default MapTracon;
