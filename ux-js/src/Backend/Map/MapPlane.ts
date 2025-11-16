import { Feature } from 'ol';
import { FeatureLike } from 'ol/Feature';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import RadarPlane from '../LocalRadar/RadarPlane';
import NetworkPilot from '../NetworkUplink/Source/Objects/NetworkPilot';
import MotionState from './MotionState';
import LocalPlaneLayers from './Layers/LocalPlaneLayers';

class MapPlane {
    private pos: Point;
    public readonly point: Feature;
    public readonly label: Feature;

    public constructor(callsign: string, state: MotionState) {
        this.pos = new Point(fromLonLat([ state.longitude, state.latitude ]));
        this.point = new Feature(this.pos);
        this.label = new Feature(this.pos);
        this.setDefaultStyle();

        this.label.set('callsign', callsign);
        this.point.set('motion', state);
        this.label.set('motion', state);
    }

    public set callsign(callsign: string) {
        this.label.set('callsign', callsign);
    }

    public static getCallsign(feature: FeatureLike): string | null {
        const value = feature.get('callsign');
        if (typeof value !== 'string') {
            return null;
        }
        return value;
    }

    public set motionState(state: MotionState) {
        this.pos.setCoordinates(fromLonLat([ state.longitude, state.latitude ]));

        this.point.set('motion', state);
        this.label.set('motion', state);
    }

    public get motionState(): MotionState {
        return this.point.get('motion');
    }

    public static getMotionState(feature: FeatureLike): MotionState | null {
        const value = feature.get('motion');
        if (typeof value !== 'object') {
            return null;
        }
        return value;
    }

    public getPlainCoords() {
        return this.pos.getCoordinates();
    }

    public setMainStyle() {
        this.point.setStyle(LocalPlaneLayers.mainPointStyle);
        this.label.setStyle(LocalPlaneLayers.mainLabelStyle);
        this.point.set('ol_z-index', 1, true);
        this.label.set('ol_z-index', 1, true);
    }

    public setSelectedStyle() {
        this.point.setStyle(LocalPlaneLayers.selectedPointStyle);
        this.label.setStyle(LocalPlaneLayers.selectedLabelStyle);
        this.point.set('ol_z-index', 2, true);
        this.label.set('ol_z-index', 2, true);
    }

    public setDefaultStyle() {
        this.point.setStyle(undefined);
        this.label.setStyle(undefined);
        this.point.set('ol_z-index', 0, true);
        this.label.set('ol_z-index', 0, true);
    }

    public set radarState(object: RadarPlane) {
        this.point.set('radar_state', object, true);
        this.label.set('radar_state', object, true);
    }

    public static getRadarState(feature: FeatureLike): RadarPlane | null {
        const value = feature.get('radar_state') as unknown;
        if (typeof value !== 'object') {
            return null;
        }
        return value as RadarPlane;
    }

    public set netState(obj: NetworkPilot | null) {
        this.label.set('pilot_net_state', obj, true);
        this.point.set('pilot_net_state', obj, true);
    }

    public get netState() {
        return MapPlane.getNetState(this.point);
    }

    public static getNetState(feature: FeatureLike): NetworkPilot | null {
        const value = feature.get('pilot_net_state') as unknown;
        if (value instanceof NetworkPilot) {
            return value;
        }
        return null;
    }
}
export default MapPlane;
