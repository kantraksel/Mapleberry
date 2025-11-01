import { Controller, FlightPlan, Pilot } from '../Network/VATSIM';
import { NetworkState } from '../Network/NetworkWorld';

export function getPilotRating(pilot: Pilot) {
    if (pilot.military_rating > 0) {
        const ratings = network.getMilitaryRatings();
        const value = ratings.find(value => (value.id === pilot.military_rating));
        if (value) {
            return `${value.short_name} ${value.long_name}`;
        }
    }

    const ratings = network.getPilotRatings();
    const value = ratings.find(value => (value.id === pilot.pilot_rating));
    if (value) {
        return `${value.short_name} ${value.long_name}`;
    }

    return 'Unknown';
}

export function getControllerRating(controller: Controller) {
    const ratings = network.getControllerRatings();
    const value = ratings.find(value => (value.id === controller.rating));
    if (value) {
        return `${value.short_name} ${value.long_name}`;
    }

    return 'Unknown';
}

export function getStation(controller: Controller) {
    let name = 'Unknown';

    const facilities = network.getFacilities();
    const value = facilities.find(value => (value.id === controller.facility));
    if (value) {
        name = value.long;
        if (value.id === network.getApproachId()) {
            let suffix = controller.callsign.split(/[-_]/).pop();
            if (suffix) {
                suffix = suffix.toUpperCase();
                if (suffix === 'DEP') {
                    name = 'Departure';
                } else if (suffix === 'APP') {
                    name = 'Approach';
                }
            }
        }
    }

    return `${name} ${controller.frequency}`;
}

export function getTimeOnline(data: { logon_time: string }) {
    const date = new Date(data.logon_time);
    let hours = Date.now() - date.getTime();
    hours = hours / 1000 / 60;
    const minutes = Math.floor(hours % 60);
    hours = Math.floor(hours / 60);

    const minStr = minutes.toString().padStart(2, '0');
    return `${hours}:${minStr}`;
}

export function getFlightplan(data: { flight_plan?: FlightPlan }): FlightPlan {
    if (data.flight_plan) {
        return data.flight_plan;
    }

    return {
        flight_rules: 'N/A',
        aircraft: 'N/A',
        aircraft_faa: 'N/A',
        aircraft_short: 'N/A',
        departure: 'N/A',
        arrival: 'N/A',
        alternate: 'N/A',
        deptime: 'N/A',
        enroute_time: 'N/A',
        fuel_time: 'N/A',
        remarks: 'N/A',
        route: 'N/A',
        revision_id: 0,
        assigned_transponder: 'N/A',

        cruise_tas: 'N/A',
        altitude: 'N/A',
    };
}

export function createNetUpdate(onUpdate: (state: NetworkState) => void) {
    const handler = (state?: NetworkState) => {
        if (!state) {
            cards.close();
            return;
        }
        onUpdate(state);
    };
    network.Update.add(handler);

    return () => {
        network.Update.delete(handler);
    };
}

export function createControlRadarUpdate(onUpdate: () => void) {
    const handler = () => {
        onUpdate();
    };
    controlRadar.Update.add(handler);

    return () => {
        controlRadar.Update.delete(handler);
    };
}
