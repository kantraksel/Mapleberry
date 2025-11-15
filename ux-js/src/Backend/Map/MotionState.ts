interface MotionState {
    longitude: number;
    latitude: number;
    heading: number;
    altitude: number;
    groundAltitude: number;
    indicatedSpeed: number;
    groundSpeed: number;
    verticalSpeed: number;
}
export default MotionState;

export function copyMotionState(other: MotionState): MotionState {
    return {
        longitude: other.longitude,
        latitude: other.latitude,
        heading: other.heading,
        altitude: other.altitude,
        groundAltitude: other.groundAltitude,
        indicatedSpeed: other.indicatedSpeed,
        groundSpeed: other.groundSpeed,
        verticalSpeed: other.verticalSpeed,
    };
};

function MathClamp(value: number, min: number, max: number) : number {
    return Math.min(max, Math.max(min, value));
}

export function validateMotionState(args: Partial<MotionState>) {
    if (typeof args.longitude !== 'number' || !Number.isFinite(args.longitude) ||
        typeof args.latitude !== 'number' || !Number.isFinite(args.latitude) ||
        typeof args.heading !== 'number' || !Number.isFinite(args.heading) ||
        typeof args.altitude !== 'number' || !Number.isFinite(args.altitude) ||
        typeof args.groundAltitude !== 'number' || !Number.isFinite(args.groundAltitude) ||
        typeof args.indicatedSpeed !== 'number' || !Number.isFinite(args.indicatedSpeed) ||
        typeof args.groundSpeed !== 'number' || !Number.isFinite(args.groundSpeed) ||
        typeof args.verticalSpeed !== 'number' || !Number.isFinite(args.verticalSpeed))
        return false;

    args.longitude = MathClamp(args.longitude, -360, 360);
    args.latitude = MathClamp(args.latitude, -360, 360);
    args.heading = MathClamp(args.heading, 0, 360);
    args.altitude = MathClamp(args.altitude, -10000, 100000);
    args.groundAltitude = MathClamp(args.groundAltitude, 0, 100000);
    args.indicatedSpeed = MathClamp(args.indicatedSpeed, 0, 1000);
    args.groundSpeed = MathClamp(args.groundSpeed, 0, 1000);
    args.verticalSpeed = MathClamp(args.verticalSpeed, -100000, 100000);

    return true;
}
