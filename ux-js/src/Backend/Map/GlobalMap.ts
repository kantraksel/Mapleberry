import { Map, MapBrowserEvent, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OsmSource from 'ol/source/OSM';
import { fromLonLat, toLonLat } from 'ol/proj';
import { FeatureLike } from 'ol/Feature';
import { ObjectEvent } from 'ol/Object';
import Event from '../Event';
import VectorLayer from 'ol/layer/Vector';
import { defaults as defaultControls } from 'ol/control/defaults';
import AirplaneLabelControl from './Controls/AirplaneLabelControl';
import AtisFieldsControl from './Controls/ToggleAtisFieldsControl';
import AirportLabelControl from './Controls/AirportLabelControl';
import VisibilityControl from './Controls/ToggleAirplaneControl';
import { MapLibreLayer } from '@geoblocks/ol-maplibre-layer';
import { StyleSpecification } from "@maplibre/maplibre-gl-style-spec";
import { getLocales, localizeLayers } from './LabelLocalisation';

type ClickEvent = (e: FeatureLike[]) => void;
type ResEvent = (value: number) => void;
type PosEvent = (value: number[]) => void;
type GenericEvent = () => void;
type VisEvent = (value: boolean) => void;

interface SavedPos {
    longitude: number,
    latitude: number,
    resolution: number,
}

export enum MapType {
    OsmRaster,
    OsmVector,
}

class GlobalMap {
    public readonly map: Map;
    private osm: TileLayer;
    private mapLibre: MapLibreLayer;
    
    private isPointerDragging: boolean;
    private isInteracting: boolean;
    private cursorInteractIcon: boolean;
    private isVisible: boolean;
    public readonly clickEvent: Event<ClickEvent>;
    public readonly moveStartEvent: Event<GenericEvent>;
    public readonly changeResEvent: Event<ResEvent>;
    public readonly visibilityEvent: Event<VisEvent>;
    public readonly changePosEvent: Event<PosEvent>;
    public readonly cursorEvent: Event<ClickEvent>;

    private lastPos: SavedPos;
    private lastPosUpdate: number;
    private type: MapType;
    private useLocale_: boolean;

    public constructor() {
        this.isPointerDragging = false;
        this.isInteracting = false;
        this.cursorInteractIcon = false;
        this.isVisible = options.get('map_visible', true);
        this.clickEvent = new Event();
        this.moveStartEvent = new Event();
        this.changeResEvent = new Event();
        this.visibilityEvent = new Event();
        this.changePosEvent = new Event();
        this.cursorEvent = new Event();
        this.lastPos = { longitude: 12, latitude: 50, resolution: 4892 };
        this.lastPosUpdate = Number.POSITIVE_INFINITY;
        this.type = options.get<MapType>('map_type', MapType.OsmVector);
        this.useLocale_ = options.get<boolean>('map_use_locale', false);

        let pos = options.get<SavedPos | null>('map_last_position', this.lastPos);
        if (!pos) {
            pos = this.lastPos;
            this.lastPosUpdate = NaN;
        }
        this.lastPos = pos;

        const view = new View({
            center: fromLonLat([pos.longitude, pos.latitude]),
            resolution: pos.resolution,
            minResolution: 0.5,
            maxResolution: 15105,
        });
        const defaultView = new View();
        this.osm = new TileLayer({
            source: new OsmSource(),
            visible: this.type == MapType.OsmRaster,
        });
        this.mapLibre = new MapLibreLayer({
            opacity: 1.0,
            mapLibreOptions: {
                style: 'https://americanamap.org/style.json',
            },
            translateZoom: zoom => {
                const res = view.getResolutionForZoom(zoom);
                const retZoom = defaultView.getZoomForResolution(res);
                return retZoom!;
            },
            visible: this.type == MapType.OsmVector,
        });
        this.map = new Map({
            layers: [
                this.osm,
                this.mapLibre,
            ],
            view: view,
            controls: defaultControls().extend([
                new AirplaneLabelControl(),
                new AirportLabelControl(),
                new AtisFieldsControl(),
                new VisibilityControl(),
            ]),
        });

        this.map.on('movestart', () => {
            this.isInteracting = true;

            if (this.isPointerDragging) {
                this.moveStartEvent.invoke();
            }
        });

        this.map.on('moveend', () => {
            this.isInteracting = false;
            this.isPointerDragging = false;
        });

        this.map.on('pointerdrag', () => {
            this.isPointerDragging = true;
        });

        this.map.on('pointermove', (e: MapBrowserEvent<PointerEvent>) => {
            const features = this.map.getFeaturesAtPixel(e.pixel);
            this.cursorEvent.invoke(sortFeatures(features));
        });

        this.map.on('click', (e: MapBrowserEvent<PointerEvent>) => {
            const features = this.map.getFeaturesAtPixel(e.pixel);
            if (features.length == 0) {
                return;
            }
            this.clickEvent.invoke(sortFeatures(features));
        });

        view.on('change:resolution', (e: ObjectEvent) => {
            const resolution = e.target.get(e.key) as number;
            this.changeResEvent.invoke(resolution);
        });

        view.on('change:center', (e: ObjectEvent) => {
            const center = e.target.get(e.key) as number[];
            this.changePosEvent.invoke(center);
        });

        this.changeResEvent.add((value) => {
            this.lastPos.resolution = value;
            
            if (!Number.isNaN(this.lastPosUpdate)) {
                this.lastPosUpdate = Date.now();
            }
        });
        this.changePosEvent.add((value) => {
            const pos = toLonLat(value);
            this.lastPos.longitude = pos[0];
            this.lastPos.latitude = pos[1];
            
            if (!Number.isNaN(this.lastPosUpdate)) {
                this.lastPosUpdate = Date.now();
            }
        });
        setInterval(() => {
            if (this.lastPosUpdate + 500 <= Date.now()) {
                this.lastPosUpdate = Number.POSITIVE_INFINITY;
                options.set('map_last_position', this.lastPos);
            }
        }, 500);
    }

    public setParent(node: HTMLElement): void {
        if (this.map.getTargetElement())
            return;

        node.focus();
        this.map.setTarget(node);

        let styleUpdated = false;
        const mapLibre = this.mapLibre.mapLibreMap;
        mapLibre?.on('styleimagemissing', ev => {
            //todo: shieldlib
        });
        mapLibre?.on('styledata', ev => {
            if (styleUpdated) {
                return;
            }
            styleUpdated = true;

            const e = ev as unknown as { style: { stylesheet: StyleSpecification } };
            this.updateStyleLocalization(e.style.stylesheet);
            ev.target.setStyle(e.style.stylesheet);
        });
    }

    private updateStyleLocalization(style: StyleSpecification) {
        const locales = this.useLocale_ ? getLocales() : ['en'];
        localizeLayers(style.layers as any, locales);
    }

    public setCenterZoom(longitude: number, latitude: number, resolution?: number) {
        if (this.isInteracting || !this.visible) {
            return false;
        }

        const view = this.map.getView();
        view.setCenter(fromLonLat([ longitude, latitude ]));
        if (typeof resolution === 'number')
            view.setResolution(resolution);
        return true;
    }

    public set visible(value: boolean) {
        this.isVisible = value;
        options.set('map_visible', value);
        this.visibilityEvent.invoke(value);
    }

    public get visible() {
        return this.isVisible;
    }

    public set lastPosition(value: boolean) {
        if (value) {
            this.lastPosUpdate = 0;
        } else {
            this.lastPosUpdate = NaN;
            options.set('map_last_position', null);
        }
    }

    public get lastPosition() {
        return !Number.isNaN(this.lastPosUpdate);
    }

    public setCursor(interact: boolean) {
        const isInteract = this.cursorInteractIcon;
        if ((interact && isInteract) || (!interact && !isInteract)) {
            return;
        }
        const root = this.map.getTargetElement();
        if (!root) {
            return;
        }
        this.cursorInteractIcon = interact;
        root.style.cursor = interact ? 'pointer' : 'auto';
    }

    public set mapType(type: MapType) {
        this.type = type;
        options.set('map_type', type);

        if (type == MapType.OsmVector) {
            this.osm.setVisible(false);
            this.mapLibre.setVisible(true);
        } else {
            if (type != MapType.OsmRaster) {
                console.warn(`Unknown map type ${type}. Falling back to OsmRaster`);
            }
            this.osm.setVisible(true);
            this.mapLibre.setVisible(false);
        }
    }

    public get mapType() {
        return this.type;
    }

    public set useLocale(value: boolean) {
        this.useLocale_ = value;
        options.set('map_use_locale', value);

        const map = this.mapLibre.mapLibreMap;
        if (map) {
            const style = map.getStyle();
            this.updateStyleLocalization(style);
            map.setStyle(style);
        }
    }

    public get useLocale() {
        return this.useLocale_;
    }
}

function sortFeatures(features: FeatureLike[]) {
    if (features.length < 2) {
        return features;
    }

    let layers = features.map<VectorLayer | undefined>(feature => feature.get('ol_layer'));
    let startLayer = layers[0];
    let startLayerIdx = 0;
    let startFeatureZ = features[0].get('ol_z-index');
    let result: FeatureLike[] = [];

    for (let i = 1; i < features.length; ++i) {
        const feature = features[i];
        const layer = layers[i];
        if (startLayer == layer) {
            if (startFeatureZ === feature.get('ol_z-index')) {
                continue;
            }
        }

        const set = features.slice(startLayerIdx, i);
        if (startLayer) {
            set.reverse();
        }
        set.forEach(feature => result.push(feature));

        startLayer = layer;
        startLayerIdx = i;
        startFeatureZ = feature.get('ol_z-index');
    }

    const set = features.slice(startLayerIdx);
    if (startLayer) {
        set.reverse();
    }
    set.forEach(feature => result.push(feature));

    return result;
}

export default GlobalMap;
