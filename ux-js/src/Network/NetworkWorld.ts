import Event from "../Event";
import { Atis, Controller, Facility, LiveNetworkData, Pilot, Prefile, Rating } from "./VATSIM";

export interface NetworkState {
    observers: Controller[],
    controllers: Controller[],
    atis: Atis[],
    pilots: Pilot[],
    prefiles: Prefile[],
}

interface NetPropsCache {
    facilities: Facility[],
    controller_ratings: Rating[],
    pilot_ratings: Rating[],
    military_ratings: Rating[],
    local_facilities: Set<number>,
}

function splitObservers(data: LiveNetworkData) {
    const observerId = data.facilities.find(facility => facility.short == 'OBS')?.id ?? 0;
    const observers: Controller[] = [];
    const controllers: Controller[] = [];

    data.controllers.forEach(controller => {
        if (controller.facility === observerId) {
            observers.push(controller);
        } else {
            controllers.push(controller);
        }
    });

    return [ controllers, observers ] as const;
}

function createPropsCache(data: LiveNetworkData) {
    const ratings: Rating[] = [];
    data.ratings.forEach(value => {
        ratings.push({
            id: value.id,
            short_name: value.short_name ?? value.short!,
            long_name: value.long_name ?? value.long!,
        });
    });

    const local_facilities = new Set<number>();
    data.facilities.forEach(value => {
        switch (value.short) {
            case 'DEL':
            case 'GND':
            case 'TWR':
            case 'APP':
                local_facilities.add(value.id);
                break;
        }
    });

    return {
        facilities: data.facilities,
        controller_ratings: ratings,
        pilot_ratings: data.pilot_ratings,
        military_ratings: data.military_ratings,
        local_facilities,
    };
}

class NetworkWorld {
    private state?: NetworkState;
    private propsCache?: NetPropsCache;

    public readonly Update: Event<(state?: NetworkState) => void>;

    constructor() {
        this.Update = new Event();
    }

    public updateState(data: LiveNetworkData | undefined) {
        if (!data) {
            this.state = undefined;
            this.Update.invoke();
            return;
        }

        const [ controllers, observers ] = splitObservers(data);

        this.propsCache = createPropsCache(data);
        this.state = {
            observers,
            controllers,
            atis: data.atis,
            pilots: data.pilots,
            prefiles: data.prefiles,
        };

        setTimeout(() => {
            this.Update.invoke(this.state);
        });
    }

    public getState() {
        return this.state;
    }

    public getPilotRatings() {
        return this.propsCache?.pilot_ratings ?? [];
    }

    public getMilitaryRatings() {
        return this.propsCache?.military_ratings ?? [];
    }

    public getControllerRatings() {
        return this.propsCache?.controller_ratings ?? [];
    }

    public getFacilities() {
        return this.propsCache?.facilities ?? [];
    }

    public getLocalFacilities() {
        return this.propsCache?.local_facilities ?? new Set();
    }
}

export default NetworkWorld;
export type { Atis, Controller, Facility, LiveNetworkData, Pilot, Prefile, Rating };
