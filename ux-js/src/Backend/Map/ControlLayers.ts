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

    public constructor() {
        this.areaLayers = new AreaLayers();
        this.fieldLayers = new FieldLayers();
        this.traconLayers = new TraconLayers(this.areaLayers);
    }

    public setupLayers() {
        const map = window.map.map;
        map.addLayer(this.areaLayers.areaLayer);
        map.addLayer(this.traconLayers.traconLayer);
        map.addLayer(this.fieldLayers.fieldLayer);
    }

    public setupLabelLayers() {
        const map = window.map.map;
        map.addLayer(this.areaLayers.areaLabelLayer);
        map.addLayer(this.fieldLayers.fieldLabelLayer);
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
}
export default ControlLayer;
