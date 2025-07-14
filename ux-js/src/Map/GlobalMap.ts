import { Map, MapBrowserEvent, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OsmSource from 'ol/source/OSM';
import { fromLonLat, toLonLat } from 'ol/proj';
import { FeatureLike } from 'ol/Feature';
import { ObjectEvent } from 'ol/Object';
import Event from '../Event';

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

class GlobalMap {
    public readonly map: Map;
    
    private isPointerDragging: boolean;
    private isInteracting: boolean;
    public readonly clickEvent: Event<ClickEvent>;
    public readonly moveStartEvent: Event<GenericEvent>;
    public readonly changeResEvent: Event<ResEvent>;
    public readonly visibilityEvent: Event<VisEvent>;
    public readonly changePosEvent: Event<PosEvent>;

    private lastPos: SavedPos;
    private lastPosUpdate: number;

    public constructor() {
        this.isPointerDragging = false;
        this.isInteracting = false;
        this.clickEvent = new Event();
        this.moveStartEvent = new Event();
        this.changeResEvent = new Event();
        this.visibilityEvent = new Event();
        this.changePosEvent = new Event();
        this.lastPos = { longitude: 12, latitude: 50, resolution: 4892 };
        this.lastPosUpdate = Number.POSITIVE_INFINITY;

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
        this.map = new Map({
            layers: [
                new TileLayer({
                    source: new OsmSource(),
                }),
            ],
            view: view,
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

        this.map.on('click', (e: MapBrowserEvent<PointerEvent>) => {
            const features = this.map.getFeaturesAtPixel(e.pixel);
            this.clickEvent.invoke(features);
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
        options.set('map_visible', value);
        this.visibilityEvent.invoke(value);
    }

    public get visible() {
        return options.get('map_visible', true);
    }

    public set saveLastPosition(value: boolean) {
        if (value) {
            this.lastPosUpdate = 0;
        } else {
            this.lastPosUpdate = NaN;
            options.set('map_last_position', null);
        }
    }

    public get saveLastPosition() {
        return !Number.isNaN(this.lastPosUpdate);
    }
}

export default GlobalMap;
