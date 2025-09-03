import { IconButton } from '@mui/material';
import { CardLeftToolbar, CardRightToolbar, createControlRadarUpdate, DataTable, getControllerRating, getStation, getTimeOnline, StationCardBase, TextBox } from './CardsShared';
import { useEffect, useRef, useState } from 'react';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import { NetworkArea, NetworkController, NetworkField } from '../../Network/ControlRadar';

function updateAtis(atisHandler: { current: (() => void) | undefined }, data: NetworkController | undefined) {
    atisHandler.current = undefined;
    if (!data) {
        return;
    }

    const field = data.station;
    if (field instanceof NetworkField && field.atis.length == 1) {
        atisHandler.current = () => {
            cards.showAtisCard(field.atis[0]);
        };
    }
}

function ControllerCard() {
    const [object, setObject] = useState<NetworkController>();
    const [absent, setAbsent] = useState(false);
    const [rev, setRev] = useState(0);
    const atisHandler = useRef<() => void>(undefined);

    useEffect(() => {
        cards.controllerRef = data => {
            setObject(data);
            setAbsent(false);
            updateAtis(atisHandler, data);
            setRev(rev + 1);
        };

        return () => {
            cards.controllerRef = undefined;
        };
    }, []);

    useEffect(() => {
        if (!object) {
            return;
        }

        return createControlRadarUpdate(() => {
            if (!object.expired()) {
                updateAtis(atisHandler, object);
                setRev(rev + 1);
            } else {
                const controller = controlRadar.findController(object);
                if (controller) {
                    setObject(controller);
                    setAbsent(false);
                    updateAtis(atisHandler, controller);
                    setRev(rev + 1);
                } else {
                    setAbsent(true);
                    updateAtis(atisHandler, object);
                }
            }
        });
    }, [object]);

    if (!object) {
        return <></>;
    }
    const data = object.data;

    const rating = getControllerRating(data);
    const timeOnline = getTimeOnline(data);
    const station = getStation(data);
    const info = data.text_atis?.join('\n') ?? 'N/A';
    const hasAtis = atisHandler.current ? 'unset' : 'hidden';

    const table = [
        [
            ['Name:', 'Station:'],
            [data.name, station],
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
    }

    return (
        <StationCardBase width='auto' maxWidth='100vw' title={data.callsign} absent={absent} onTitleClick={onFocus}>
            <CardLeftToolbar />
            <CardRightToolbar>
                <IconButton onClick={atisHandler.current} sx={{ visibility: hasAtis }}><CloudOutlinedIcon /></IconButton>
            </CardRightToolbar>
            <DataTable data={table} />
            <TextBox label='Information' value={info} />
        </StationCardBase>
    );
}
export default ControllerCard;
