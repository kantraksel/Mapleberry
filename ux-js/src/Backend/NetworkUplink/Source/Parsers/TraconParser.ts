export interface Tracon {
    type: 'FeatureCollection',
    name: string,
    crs: {
        type: 'name',
        properties: {
            name: string,
        },
    },
    features: (TraconFeature | TraconFeatureCollection)[],
}

export interface TraconFeatureCollection {
    type: 'FeatureCollection',
    features: TraconFeature[],
}

export interface TraconFeature {
    type: 'Feature',
    properties: {
        id: string,
        prefix: string | string[],
        suffix: string | undefined,
        name: string,
    },
    geometry: MultiPolygon | Polygon,
}

interface MultiPolygon {
    type: 'MultiPolygon',
    coordinates: number[][][][],
}

interface Polygon {
    type: 'Polygon',
    coordinates: number[][][],
}

function isArray(obj: unknown) {
    return typeof obj === 'object' && obj instanceof Array;
}

export function validateTracon(data: Partial<Tracon>) {
    if (data.type !== 'FeatureCollection') {
        throw new Error('Boundaries is not FeatureCollection');
    }

    if (typeof data.name !== 'string') {
        throw new Error('Boundaries: name is not a string');
    }

    const features = data.features;
    if (!isArray(features)) {
        throw new Error('Feature array is not an array');
    }

    features.forEach((obj, index) => {
        if (obj.type == 'FeatureCollection') {
            if (!isArray(obj.features)) {
                throw new Error(`Feature array of collection ${index} is not an array`);
            }

            obj.features.forEach((obj, id) => {
                try {
                    validateTraconFeature(obj, id);
                } catch (e: unknown) {
                    const err = e as Error;
                    err.message = `Feature collection ${index}: ${err.message}`;
                    console.info(obj);
                    throw err;
                }
            });
        } else {
            validateTraconFeature(obj, index);
        }
    });
}

function validateTraconFeature(obj: TraconFeature, index: number) {
    if (obj.type !== 'Feature') {
        throw new Error(`Feature ${index} is not Feature`);
    }

    const properties = obj.properties;
    if (typeof properties !== 'object' ||
        typeof properties.id !== 'string' ||
        (typeof properties.prefix !== 'string' && !isArray(properties.prefix)) ||
        (typeof properties.suffix !== 'string' && properties.suffix !== undefined) ||
        (typeof properties.name !== 'string')
    ) {
        throw new Error(`Feature ${index}: properties field is invalid`);
    }

    const geometry = obj.geometry;
    if (typeof geometry !== 'object') {
        throw new Error(`Feature ${index}: geometry field is not an object`);
    }

    if (geometry.type === 'MultiPolygon') {
        const coords = geometry.coordinates;
        if (!isArray(coords)) {
            throw new Error(`Feature ${index}: Geometry coordinates field is invalid`);
        }

        coords.forEach(coords => {
            validatePolygon(coords, index);
        });
    } else if (geometry.type === 'Polygon') {
        validatePolygon(geometry.coordinates, index);
    } else {
        throw new Error(`Feature ${index}: Geometry is not a known type`);
    }
}

function validatePolygon(coords: number[][][], index: number) {
    if (!isArray(coords)) {
        throw new Error(`Feature ${index}: Geometry coordinates field is invalid`);
    }

    coords.forEach(coords => {
        if (!isArray(coords)) {
            throw new Error(`Feature ${index}: Geometry coordinates field is invalid`);
        }

        coords.forEach(coords => {
            if (!isArray(coords)) {
                throw new Error(`Feature ${index}: Geometry coordinates field is invalid`);
            }
        });
    });
}
