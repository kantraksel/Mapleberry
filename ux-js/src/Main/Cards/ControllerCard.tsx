import { IconButton } from '@mui/material';
import { ControllerEx, VatsimArea, VatsimField } from '../../Network/ControlRadar';
import { CardLeftToolbar, CardRightToolbar, createNetUpdate, DataTable, getControllerRating, getStation, getTimeOnline, StationCardBase, TextBox } from './CardsShared';
import { useEffect, useRef, useState } from 'react';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';

function updateAtis(atisHandler: { current: (() => void) | undefined }, data: ControllerEx | undefined) {
    atisHandler.current = undefined;
    if (!data) {
        return;
    }

    const field = data.station;
    if (field instanceof VatsimField && field.atis.length == 1) {
        atisHandler.current = () => {
            cards.showAtisCard(field.atis[0]);
        };
    }
}

function ControllerCard() {
    const [data, setData] = useState<ControllerEx>();
    const [absent, setAbsent] = useState(false);
    const atisHandler = useRef<() => void>(undefined);

    useEffect(() => {
        cards.controllerRef = data => {
            setData(data);
            setAbsent(false);
            updateAtis(atisHandler, data);
        };

        return () => {
            cards.controllerRef = undefined;
        };
    }, []);

    useEffect(() => {
        if (!data) {
            return;
        }

        return createNetUpdate(state => {
            const value = state.controllers.find(value => value.cid === data.cid && value.callsign === data.callsign);
            if (value) {
                setData(value);
                setAbsent(false);
                updateAtis(atisHandler, value);
            } else {
                setAbsent(true);
                updateAtis(atisHandler, data);
            }
        });
    }, [data]);

    if (!data) {
        return <></>;
    }

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
    const control = data.station;
    if (control instanceof VatsimField) {
        const lon = control.station.longitude;
        const lat = control.station.latitude;
        onFocus = () => {
            radar.animator.unfollowPlane();
            map.setCenterZoom(lon, lat);
        };
    } else if (control instanceof VatsimArea) {
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
