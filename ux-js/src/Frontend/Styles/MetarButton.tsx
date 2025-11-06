import { IconButton, Menu, MenuItem } from "@mui/material";
import { NetworkControl, NetworkField } from "../../Backend/Network/ControlRadar";
import { useRef, useState } from "react";
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';

export function MetarButton(props: { data: NetworkControl | undefined }) {
    const field = props.data;
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
