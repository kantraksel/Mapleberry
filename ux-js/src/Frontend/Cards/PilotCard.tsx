import { Divider } from '@mui/material';
import { createControlRadarUpdate, getFlightplan, getTimeOnline } from './Shared';
import { useEffect, useState } from 'react';
import { StationCard } from './Elements/StationCard';
import { DataTable } from './Elements/DataTable';
import { RouteBox } from './Elements/RouteBox';
import { UserName } from './Elements/UserName';
import { Pilot } from '../../Backend/NetworkUplink/Source/Objects/LiveNetworkData';
import NetworkPilot from '../../Backend/NetworkUplink/Source/Objects/NetworkPilot';
import useRev from '../useRev';

function getPilotRating(pilot: Pilot) {
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

function PilotCard() {
    const [object, setObject] = useState<NetworkPilot>();
    const [absent, setAbsent] = useState(false);
    const [rev, addRev] = useRev();

    useEffect(() => {
        cards.pilotRef = value => {
            setObject(value);
            setAbsent(false);
            addRev();
        };

        return () => {
            cards.pilotRef = undefined;
        };
    }, [rev]);

    useEffect(() => {
        if (!object) {
            return;
        }
        
        return createControlRadarUpdate(() => {
            if (!object.expired()) {
                addRev();
            } else {
                const pilot = trafficRadar.findPilot(object);
                if (pilot) {
                    setObject(pilot);
                    setAbsent(false);
                    addRev();
                } else {
                    setAbsent(true);
                }
            }
        });
    }, [object, rev]);
    
    if (!object) {
        return <></>;
    }
    const data = object.pilot;

    const flightplan = getFlightplan(data);
    const rating = getPilotRating(data);
    const timeOnline = getTimeOnline(data);

    const table = [
        [
            ['Name:', 'Aircraft:'],
            [<UserName cid={data.cid} name={data.name} />, flightplan.aircraft_faa],
        ],
        [
            ['Pilot Rating:', 'Time Online:'],
            [rating, timeOnline],
        ],
    ];

    const onFocus = () => {
        if (object.external) {
            radar.animator.followPlane(object.external);
            return;
        }
        const params = object.blip.motionState;
        radar.animator.unfollowPlane();
        map.setCenterZoom(params.longitude, params.latitude);
    };

    return (
        <StationCard width='auto' maxWidth='100vw' minWidth={500} title={data.callsign} absent={absent} onTitleClick={onFocus}>
            <DataTable data={table} />
            <Divider flexItem sx={{ mt: '5px', mb: '5px' }} />
            <RouteBox flight_plan={flightplan} />
        </StationCard>
    );
}
export default PilotCard;
