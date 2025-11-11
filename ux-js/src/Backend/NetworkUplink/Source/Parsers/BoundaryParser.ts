export interface Boundaries {
    type: 'FeatureCollection',
    name: string,
    crs: {
        type: 'name',
        properties: {
            name: string,
        },
    },
    features: BoundaryFeature[],
}

export interface BoundaryFeature {
    type: 'Feature',
    properties: {
        id: string,
        oceanic: string | number,
        label_lon: string | number,
        label_lat: string | number,
        region: string | null,
        division: string | null,
    },
    geometry: {
        type: 'MultiPolygon',
        coordinates: number[][][][],
    },
}

/*
Known coordinate layouts:
[[[250x[2xnumber]]]]
[ [[009x[2x number]]], [[8x[2x number]]] ] <- two separate polygons
[[[ 004x[2x number], 7x[3x number] ]]] <- first is polygon, second are holes in it
*/

function isArray(obj: unknown) {
    return typeof obj === 'object' && obj instanceof Array;
}

export function validateBoundaries(data: Partial<Boundaries>) {
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
        if (obj.type !== 'Feature') {
            throw new Error(`Feature ${index} is not Feature`);
        }

        const properties = obj.properties;
        if (typeof properties !== 'object' ||
            typeof properties.id !== 'string' ||
            (typeof properties.oceanic !== 'string' && typeof properties.oceanic !== 'number') ||
            (typeof properties.label_lon !== 'string' && typeof properties.label_lon !== 'number') ||
            (typeof properties.label_lat !== 'string' && typeof properties.label_lat !== 'number') ||
            (typeof properties.region !== 'string' && properties.region !== null) ||
            (typeof properties.division !== 'string' && properties.division !== null)
        ) {
            throw new Error(`Feature ${index}: properties field is invalid`);
        }

        const geometry = obj.geometry;
        if (typeof geometry !== 'object') {
            throw new Error(`Feature ${index}: geometry field is not an object`);
        }

        if (geometry.type !== 'MultiPolygon') {
            throw new Error(`Feature ${index}: Geometry is not MultiPolygon`);
        }

        const coords = geometry.coordinates;
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

                coords.forEach(coords => {
                    if (!isArray(coords)) {
                        throw new Error(`Feature ${index}: Geometry coordinates field is invalid`);
                    }
                });
            });
        });
    });
}
