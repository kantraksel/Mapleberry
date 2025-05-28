import { Map, MapBrowserEvent, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OsmSource from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';
import { FeatureLike } from 'ol/Feature';
import { ObjectEvent } from 'ol/Object';
import Event from '../Event';

type ClickEvent = (e: FeatureLike) => void;
type ResEvent = (value: number) => void;
type GenericEvent = () => void;
type VisEvent = (value: boolean) => void;

class GlobalMap {
    public readonly map: Map;
    
    private isPointerDragging: boolean;
    private isInteracting: boolean;
    public readonly clickEvent: Event<ClickEvent>;
    public readonly moveStartEvent: Event<GenericEvent>;
    public readonly changeResEvent: Event<ResEvent>;
    public readonly visibilityEvent: Event<VisEvent>;

    public constructor() {
        this.isPointerDragging = false;
        this.isInteracting = false;
        this.clickEvent = new Event();
        this.moveStartEvent = new Event();
        this.changeResEvent = new Event();
        this.visibilityEvent = new Event();

        const view = new View({
            center: fromLonLat([12, 50]),
            resolution: 4892,
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
            this.map.forEachFeatureAtPixel(e.pixel, (feature) => {
                this.clickEvent.invoke(feature);
            });
        });

        view.on('change:resolution', (e: ObjectEvent) => {
            const resolution = e.target.get(e.key) as number;
            this.changeResEvent.invoke(resolution);
        });
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
}

export default GlobalMap;
