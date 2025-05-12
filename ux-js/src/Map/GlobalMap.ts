import { Map, MapBrowserEvent, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import OsmSource from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector'
import { fromLonLat } from 'ol/proj';
import { StyleLike } from 'ol/style/Style';
import { FeatureLike } from 'ol/Feature';
import { ObjectEvent } from 'ol/Object';
import { Style as OlStyle, Text as OlText, Fill as OlFill, Stroke as OlStroke, Icon as OlIcon } from 'ol/style';
import { PhysicParams } from './PlaneRadar';

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
	private pointStyle: OlStyle;
	private labelStyle: OlStyle;
	private mainPointStyle: StyleLike;
	private mainLabelStyle: StyleLike;

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

		this.pointStyle = new OlStyle({
			image: new OlIcon({
				src: '/flight_24dp_FFFFFF.svg',
				color: '#0000AA',
			}),
		});
		this.labelStyle = new OlStyle({
			text: new OlText({
				padding: [ 3, 3, 3, 7], // top, right, bottom, left
				offsetY: -30, // one-liner: -20
				font: '14px cascadia-code',
				backgroundFill: new OlFill({
					color: 'lightgray',
				}),
				backgroundStroke: new OlStroke({
					color: 'black',
					width: 1,
				}),
				textAlign: 'center',
			}),
		});
		this.mainPointStyle = this.createPointLayerStyle(new OlStyle({
			image: new OlIcon({
				src: '/flight_24dp_FFFFFF.svg',
				color: '#AA0000',
			}),
			zIndex: 1,
		}));
		const mainLabelStyle = this.labelStyle.clone();
		mainLabelStyle.setZIndex(1);
		this.mainLabelStyle = this.createLabelLayerStyle(mainLabelStyle);

		this.pointSource = new VectorSource();
		this.labelSource = new VectorSource();
		this.pointLayer = new VectorLayer({
			style: this.createPointLayerStyle(this.pointStyle),
			source: this.pointSource,
		});
		this.labelLayer = new VectorLayer({
			style: this.createLabelLayerStyle(this.labelStyle),
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

	public get mainPointLayerStyle() {
		return this.mainPointStyle;
	}

	public get mainLabelLayerStyle() {
		return this.mainLabelStyle;
	}

	private createLabelLayerStyle(base: OlStyle) {
		return (feature: FeatureLike) => {
			const style = base.clone();
			const params = feature.get('params') as PhysicParams | undefined;

			let callsign = feature.get('callsign') ?? '#UFO';
			let altitude = params ? Math.round(params.altitude) : '-';
			let speed = params ? Math.round(params.groundSpeed) : '-';

			const str = `${callsign}\n${altitude}ft ${speed}kts`;
			style.getText()!.setText(str);
			return style;
		};
	}

	private createPointLayerStyle(base: OlStyle) {
		return (feature: FeatureLike) => {
			const style = base.clone();
			const rot = feature.get('hdg_rad') ?? 0;

			style.getImage()!.setRotation(rot);
			return style;
		};
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
