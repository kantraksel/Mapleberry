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

    public setSelectedStyle() {
        this.point.setStyle(planeLayers.selectedPointStyle);
        this.label.setStyle(planeLayers.selectedLabelStyle);
    }

    public setDefaultStyle() {
        this.point.setStyle();
        this.label.setStyle();
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
    groundAltitude: number;
    indicatedSpeed: number;
    groundSpeed: number;
    verticalSpeed: number;
}

export function copyPhysicParams(other: PhysicParams): PhysicParams {
    return {
        longitude: other.longitude,
        latitude: other.latitude,
        heading: other.heading,
        altitude: other.altitude,
        groundAltitude: other.groundAltitude,
        indicatedSpeed: other.indicatedSpeed,
        groundSpeed: other.groundSpeed,
        verticalSpeed: other.verticalSpeed,
    };
};

function MathClamp(value: number, min: number, max: number) : number {
    return Math.min(max, Math.max(min, value));
}

export function validatePhysicParams(args: Partial<PhysicParams>) {
    if (typeof args.longitude !== 'number' || !Number.isFinite(args.longitude) ||
        typeof args.latitude !== 'number' || !Number.isFinite(args.latitude) ||
        typeof args.heading !== 'number' || !Number.isFinite(args.heading) ||
        typeof args.altitude !== 'number' || !Number.isFinite(args.altitude) ||
        typeof args.groundAltitude !== 'number' || !Number.isFinite(args.groundAltitude) ||
        typeof args.indicatedSpeed !== 'number' || !Number.isFinite(args.indicatedSpeed) ||
        typeof args.groundSpeed !== 'number' || !Number.isFinite(args.groundSpeed) ||
        typeof args.verticalSpeed !== 'number' || !Number.isFinite(args.verticalSpeed))
        return false;

    args.longitude = MathClamp(args.longitude, -360, 360);
    args.latitude = MathClamp(args.latitude, -360, 360);
    args.heading = MathClamp(args.heading, 0, 360);
    args.altitude = MathClamp(args.altitude, -10000, 100000);
    args.groundAltitude = MathClamp(args.groundAltitude, 0, 100000);
    args.indicatedSpeed = MathClamp(args.indicatedSpeed, 0, 1000);
    args.groundSpeed = MathClamp(args.groundSpeed, 0, 1000);
    args.verticalSpeed = MathClamp(args.verticalSpeed, -100000, 100000);

    return true;
}

export default MapPlane;
