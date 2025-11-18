import AreaLayers from './Layers/AreaLayers';
import FieldLayers from './Layers/FieldLayers';
import TraconLayers from './Layers/TraconLayers';
import MapArea from './MapArea';
import MapField from './MapField';
import MapTracon from './MapTracon';

class ControlLayer {
    private areaLayers: AreaLayers;
    private fieldLayers: FieldLayers;
    private traconLayers: TraconLayers;

    private atisFields_: boolean;
    private useLID_: boolean;

    public constructor() {
        this.atisFields_ = true;
        this.useLID_ = false;

        this.areaLayers = new AreaLayers();
        this.fieldLayers = new FieldLayers();
        this.traconLayers = new TraconLayers(this.areaLayers);
    }

    public setupLayers() {
        const map = window.map.map;
        map.addLayer(this.areaLayers.areaLayer);
        map.addLayer(this.traconLayers.traconLayer);
        map.addLayer(this.fieldLayers.pointLayer);
    }

    public setupLabelLayers() {
        const map = window.map.map;
        map.addLayer(this.areaLayers.labelLayer);
        map.addLayer(this.fieldLayers.labelLayer);
    }

    public addField(field: MapField) {
        this.fieldLayers.addField(field);
    }

    public removeField(field: MapField) {
        this.fieldLayers.removeField(field);
    }

    public addArea(area: MapArea) {
        this.areaLayers.addArea(area);
    }

    public removeArea(area: MapArea) {
        this.areaLayers.removeArea(area);
    }

    public addTracon(tracon: MapTracon) {
        this.traconLayers.addTracon(tracon);
    }

    public removeTracon(tracon: MapTracon) {
        this.traconLayers.removeTracon(tracon);
    }

    public set atisFields(value: boolean) {
        this.atisFields_ = value;
        this.fieldLayers.pointLayer.changed();
        this.fieldLayers.labelLayer.changed();
    }

    public get atisFields() {
        return this.atisFields_;
    }

    public set useLID(value: boolean) {
        this.useLID_ = value;
        this.fieldLayers.labelLayer.changed();
    }

    public get useLID() {
        return this.useLID_;
    }
}
export default ControlLayer;
