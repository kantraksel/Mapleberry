import { IconButton, Menu, MenuItem } from '@mui/material';
import { createControlRadarUpdate, DataTable, getControllerRating, getStation, getTimeOnline, StationCard, TextBox } from './CardsShared';
import { useEffect, useRef, useState } from 'react';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import { NetworkArea, NetworkController, NetworkField } from '../../Network/ControlRadar';

function MetarButton(props: { data: NetworkController | undefined }) {
    if (!props.data) {
        return <></>;
    }

    const field = props.data.station;
    if (!(field instanceof NetworkField) || field.atis.length == 0) {
        return <></>;
    }

    if (field.atis.length == 1) {
        const onClick = () => {
            cards.showAtisCard(field.atis[0]);
        };
        return <IconButton onClick={onClick}><CloudOutlinedIcon /></IconButton>;
    }

    const [menuOpen, setMenuOpen] = useState(false);
    const mainButton = useRef<HTMLButtonElement>(null);

    const list = field.atis.map(atis => {
        const data = atis.data;
        const key = `${data.callsign};${data.cid}`;
        const onClick = () => {
            cards.showAtisCard(atis);
        };

        return <MenuItem key={key} onClick={onClick}>{data.callsign} {data.frequency}</MenuItem>
    });

    return (
        <>
            <IconButton onClick={() => setMenuOpen(true)} ref={mainButton}><CloudOutlinedIcon /></IconButton>
            <Menu open={menuOpen} onClose={() => setMenuOpen(false)} anchorEl={mainButton.current}>
                {list}
            </Menu>
        </>
    );
}

function ControllerCard() {
    const [object, setObject] = useState<NetworkController>();
    const [absent, setAbsent] = useState(false);
    const [rev, setRev] = useState(0);

    useEffect(() => {
        cards.controllerRef = data => {
            setObject(data);
            setAbsent(false);
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
                setRev(rev + 1);
            } else {
                const controller = controlRadar.findController(object);
                if (controller) {
                    setObject(controller);
                    setAbsent(false);
                    setRev(rev + 1);
                } else {
                    setAbsent(true);
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
    } else if (object.substation) {
        const point = object.substation.substation.getLabelPos();
        if (point) {
            onFocus = () => {
                radar.animator.unfollowPlane();
                map.setCenterZoom(point[0], point[1]);
            };
        }
    }

    const toolsRight = (
        <>
            <MetarButton data={object} />
        </>
    );
    return (
        <StationCard width='auto' maxWidth='100vw' minWidth={500} title={data.callsign} absent={absent} onTitleClick={onFocus} toolsRight={toolsRight}>
            <DataTable data={table} />
            <TextBox label='Information' value={info} />
        </StationCard>
    );
}
export default ControllerCard;
