import { Map, MapBrowserEvent, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import OsmSource from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector'
import { fromLonLat } from 'ol/proj';
import { FlatStyle } from 'ol/style/flat';
import { FeatureLike } from 'ol/Feature';
import { ObjectEvent } from 'ol/Object';

interface EntityLike {
	addToMap: (map: MapLayers) => void;
	removeFromMap: (map: MapLayers) => void;
}

export interface MapLayers {
	points: VectorSource;
	labels: VectorSource;
}

type ClickEvent = (e: FeatureLike) => void;
type ResEvent = (value: number) => void;
type GenericEvent = () => void;

class GlobalMap {
	private map: Map;
	private pointLayer: VectorLayer;
	private pointSource: VectorSource;
	private labelLayer: VectorLayer;
	private labelSource: VectorSource;
	private pointStyle: FlatStyle;
	private labelStyle: FlatStyle;

	private isPointerDragging: boolean;
	private isInteracting: boolean;
	private clickEvent: Set<ClickEvent>;
	private moveStartEvent: Set<GenericEvent>;
	private changeResEvent: Set<ResEvent>;

	public constructor() {
		this.isPointerDragging = false;
		this.isInteracting = false;
		this.clickEvent = new Set();
		this.moveStartEvent = new Set();
		this.changeResEvent = new Set();

		this.pointStyle = {
			'icon-src': '/flight_24dp_FFFFFF.svg',
			'icon-rotation': [ 'get', 'hdg_rad' ],
		};
		this.labelStyle = {
			'text-value': [ 'get', 'callsign_text' ],
			'text-padding': [ 3, 3, 3, 7 ], // top, right, bottom, left
			'text-offset-y': -20,
			'text-font': '14px cascadia-code',
			'text-background-fill-color': 'lightgray',
			'text-background-stroke-color': 'black',
			'text-background-stroke-width': 1,
			'text-align': 'center',
		};

		this.pointSource = new VectorSource();
		this.labelSource = new VectorSource();
		this.pointLayer = new VectorLayer({
			style: {
				...this.pointStyle,
				'icon-color': '#0000AA',
			},
			source: this.pointSource,
		});
		this.labelLayer = new VectorLayer({
			style: this.labelStyle,
			source: this.labelSource,
		});

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
				this.pointLayer,
				this.labelLayer,
			],
			view: view,
		});

		this.map.on('movestart', () => {
			this.isInteracting = true;

			if (this.isPointerDragging) {
				this.moveStartEvent.forEach((value) => {
					value();
				});
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
			e.stopPropagation();

			this.pointLayer.getFeatures(e.pixel).then((value) => {
				if (value.length == 0) {
					return;
				}
				const feature = value[0];

				this.clickEvent.forEach((value) => {
					value(feature);
				});
			});
		});

		view.on('change:resolution', (e: ObjectEvent) => {
			const resolution = e.target.get(e.key) as number;
			this.changeResEvent.forEach((value) => {
				value(resolution);
			})
		});
	}

	public setParent(node: HTMLElement): void {
		if (this.map.getTargetElement())
			return;
		this.map.setTarget(node);
	}

	public addPlane(entity: EntityLike): void {
		const map = { points: this.pointSource, labels: this.labelSource };
		entity.addToMap(map);
	}

	public removePlane(entity: EntityLike): void {
		const map = { points: this.pointSource, labels: this.labelSource };
		entity.removeFromMap(map);
	}

	public get pointLayerStyle() {
		return this.pointStyle;
	}

	public get labelLayerStyle() {
		return this.labelStyle;
	}

	public setCenterZoom(longitude: number, latitude: number, resolution?: number) {
		if (this.isInteracting) {
			return false;
		}

		const view = this.map.getView();
		view.setCenter(fromLonLat([ longitude, latitude ]));
		if (typeof resolution === 'number')
			view.setResolution(resolution);
		return true;
	}

	public addClickEvent(callback: ClickEvent) {
        this.clickEvent.add(callback);
    }

    public removeClickEvent(callback: ClickEvent) {
        this.clickEvent.delete(callback);
    }

	public addMoveStartEvent(callback: GenericEvent) {
        this.moveStartEvent.add(callback);
    }

    public removeMoveStartEvent(callback: GenericEvent) {
        this.moveStartEvent.delete(callback);
    }

	public addChangeResEvent(callback: ResEvent) {
        this.changeResEvent.add(callback);
    }

    public removeChangeResEvent(callback: GenericEvent) {
        this.changeResEvent.delete(callback);
    }
}

export default GlobalMap;
