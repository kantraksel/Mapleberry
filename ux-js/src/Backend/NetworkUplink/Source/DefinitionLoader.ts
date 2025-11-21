import { Boundaries, validateBoundaries } from "./Parsers/BoundaryParser";
import { parseMainDefs } from "./Parsers/MainParser";
import { Tracon, validateTracon } from "./Parsers/TraconParser";

class DefinitionLoader {
    public static async loadDefinitions() {
        let defs = await db.getDefinitions();
        if (!defs) {
            throw new Error();
        }
        return await Promise.all([
            defs[0] ? Promise.resolve(defs[0]) : this.fetchMainDefs(),
            defs[1] ? Promise.resolve(defs[1]) : this.fetchBoundaries(),
            defs[2] ? Promise.resolve(defs[2]) : this.fetchTracons(),
        ]);
    }

    private static async fetchMainDefs() {
        const response = await fetch('/VATSpy.dat', { cache: 'default' });
        const data = await response.text();
        const obj = parseMainDefs(data);

        await db.updateMainDefs(obj, Date.now());
        return obj;
    }

    private static async fetchBoundaries() {
        const response = await fetch('/Boundaries.geojson', { cache: 'default' });
        const data = await response.json() as Boundaries;
        validateBoundaries(data);

        await db.updateBoundaryDefs(data, Date.now());
        return data;
    }

    private static async fetchTracons() {
        const response = await fetch('/TRACONBoundaries.geojson', { cache: 'default' });
        const data = await response.json() as Tracon;
        validateTracon(data);

        await db.updateTraconDefs(data, Date.now());
        return data;
    }
}
export default DefinitionLoader;
