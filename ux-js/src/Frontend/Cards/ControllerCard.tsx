import { createControlRadarUpdate, getStation, getTimeOnline } from './Shared';
import { useEffect, useState } from 'react';
import { UserName } from './Elements/UserName';
import { StationCard } from './Elements/StationCard';
import { DataTable } from './Elements/DataTable';
import { TextBox } from './Elements/TextBox';
import { Controller } from '../../Backend/NetworkUplink/Source/Objects/LiveNetworkData';
import { MetarButton } from '../Styles/MetarButton';
import NetworkController from '../../Backend/NetworkUplink/Source/Objects/NetworkController';
import NetworkField from '../../Backend/NetworkUplink/Source/Objects/NetworkField';
import NetworkArea from '../../Backend/NetworkUplink/Source/Objects/NetworkArea';
import useRev from '../useRev';

function getControllerRating(controller: Controller) {
    const ratings = network.getControllerRatings();
    const value = ratings.find(value => (value.id === controller.rating));
    if (value) {
        return `${value.short_name} ${value.long_name}`;
    }

    return 'Unknown';
}

function ControllerCard() {
    const [object, setObject] = useState<NetworkController>();
    const [absent, setAbsent] = useState(false);
    const [rev, addRev] = useRev();

    useEffect(() => {
        cards.controllerRef = data => {
            setObject(data);
            setAbsent(false);
            addRev();
        };

        return () => {
            cards.controllerRef = undefined;
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
                const controller = controlRadar.findController(object);
                if (controller) {
                    setObject(controller);
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
    const data = object.data;

    const rating = getControllerRating(data);
    const timeOnline = getTimeOnline(data);
    const station = getStation(data);
    const info = data.text_atis?.join('\n') ?? 'N/A';

    const table = [
        [
            ['Name:', 'Station:'],
            [<UserName cid={data.cid} name={data.name} />, station],
        ],
        [
            ['Controller Rating:', 'Time Online:'],
            [rating, timeOnline],
        ],
    ];

    let onFocus;
    const control = object.station;
    if (control instanceof NetworkField) {
        const lon = control.station.longitude;
        const lat = control.station.latitude;
        onFocus = () => {
            radar.animator.unfollowPlane();
            map.setCenterZoom(lon, lat);
        };
    } else if (control instanceof NetworkArea) {
        let point = control.station.label_pos;
        if (!point) {
            const labels = control.station.labels_pos;
            point = labels && labels[0];
        }
        if (point) {
            onFocus = () => {
                radar.animator.unfollowPlane();
                map.setCenterZoom(point[0], point[1]);
            };
        }
    } else if (object.substation) {
        const point = object.substation.substation.getLabelPos();
        if (point) {
            onFocus = () => {
                radar.animator.unfollowPlane();
                map.setCenterZoom(point[0], point[1]);
            };
        }
    }

    let toolsRight = (
        <>
        {
            object ? <MetarButton data={object.station} /> : <></>
        }
        </>
    );
    return (
        <StationCard width='auto' maxWidth='100vw' minWidth={526} title={data.callsign} absent={absent} onTitleClick={onFocus} toolsRight={toolsRight}>
            <DataTable data={table} />
            <TextBox label='Information' value={info} />
        </StationCard>
    );
}
export default ControllerCard;
