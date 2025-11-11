import { Boundaries, validateBoundaries } from "./Parsers/BoundaryParser";
import { parseMainDefs } from "./Parsers/MainParser";
import { Tracon, validateTracon } from "./Parsers/TraconParser";

class DefinitionLoader {
    public static async loadMainDefs() {
        const response = await fetch('/VATSpy.dat', { cache: 'default' });
        const data = await response.text();
        return parseMainDefs(data);
    }

    public static async loadBoundaries() {
        const response = await fetch('/Boundaries.geojson', { cache: 'default' });
        const data = await response.json() as Boundaries;
        validateBoundaries(data);
        return data;
    }

    public static async loadTracons() {
        const response = await fetch('/TRACONBoundaries.geojson', { cache: 'default' });
        const data = await response.json() as Tracon;
        validateTracon(data);
        return data;
    }
}
export default DefinitionLoader;
