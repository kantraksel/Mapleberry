import { Feature } from 'ol';
import { FeatureLike } from 'ol/Feature';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';

class MapPlane {
    private pos: Point;
    public readonly point: Feature;
    public readonly label: Feature;

    public constructor() {
        this.pos = new Point([ 0, 0 ]);
        this.point = new Feature(this.pos);
        this.label = new Feature(this.pos);
    }

    public setCallsign(callsign: string) {
        this.label.set('callsign', callsign);
    }

    public static getCallsign(feature: FeatureLike): string | null {
        const value = feature.get('callsign');
        if (typeof value !== 'string') {
            return null;
        }
        return value;
    }

    public setParams(params: PhysicParams) {
        this.pos.setCoordinates(fromLonLat([ params.longitude, params.latitude ]));

        this.point.set('params', params);
        this.label.set('params', params);
    }

    public static getParams(feature: FeatureLike): PhysicParams | null {
        const value = feature.get('params');
        if (typeof value !== 'object') {
            return null;
        }
        return value;
    }

    public setMainStyle() {
        this.point.setStyle(planeLayers.mainPointStyle);
        this.label.setStyle(planeLayers.mainLabelStyle);
    }

    public set userObject(object: unknown) {
        this.point.set('user_object', object, true);
    }

    public static getUserObject(feature: FeatureLike): unknown {
        return feature.get('user_object');
    }
}

export interface PhysicParams {
    longitude: number;
    latitude: number;
    heading: number;
    altitude: number;
    groundSpeed: number;
    groundAltitude: number;
    indicatedSpeed: number;
    verticalSpeed: number;
}

export function copyPhysicParams(other: PhysicParams): PhysicParams {
    return {
        longitude: other.longitude,
        latitude: other.latitude,
        heading: other.heading,
        altitude: other.altitude,
        groundSpeed: other.groundSpeed,
        groundAltitude: other.groundAltitude,
        indicatedSpeed: other.indicatedSpeed,
        verticalSpeed: other.verticalSpeed,
    };
};

export default MapPlane;
