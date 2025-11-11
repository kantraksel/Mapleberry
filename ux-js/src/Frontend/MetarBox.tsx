import { Box, Button, IconButton, Stack, TextField, Typography } from "@mui/material";
import { useRef, useState } from "react";
import { CardBase } from "./Cards/Elements/CardBase";
import { CardHeader } from "./Cards/Elements/CardHeader";
import { CardToolbar } from "./Cards/Elements/CardToolbar";
import CloseIcon from '@mui/icons-material/Close';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import { MetarButton } from "./Styles/MetarButton";
import NetworkControl from "../Backend/NetworkUplink/Source/Objects/NetworkControl";

function MetarBox(props: { open: boolean, onClose: () => void }) {
    const [message, setMessage] = useState<{ text: string, station?: NetworkControl }>({ text: '' });
    const [pending, setPending] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    if (!props.open) {
        return <></>;
    }

    const onEditKeyDown = (event : unknown) => {
        const e = event as { key: string };
        if (e.key == 'Enter') {
            onRequest();
        }
    };

    const onRequest = async () => {
        const input = inputRef.current;
        if (pending || !input || input.value.length == 0) {
            return;
        }
        setPending(true);
        const value = await metar.get(input.value);
        setMessage(value);
        setPending(false);
    };

    return (
        <CardBase width={500} maxWidth='none' minWidth='auto'>
            <CardHeader>
                <CardToolbar direction='row-reverse'>
                    <IconButton onClick={props.onClose}><CloseIcon /></IconButton>
                    <MetarButton data={message.station} />
                </CardToolbar>
                <Typography variant='h4' sx={{ fontSize: '1.8rem', lineHeight: '1.5' }}>METAR Query</Typography>
            </CardHeader>
            <Stack sx={{ paddingLeft: '7px', paddingRight: '7px', marginTop: '5px', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', width: 'stretch', gap: 1 }}>
                    <TextField variant='outlined' size='small' sx={{ flex: '1 1 auto' }} label='Airport ICAO' onKeyDown={onEditKeyDown} inputRef={inputRef} />
                    <Button variant='outlined' onClick={onRequest} loading={pending}><CloudDownloadIcon /></Button>
                </Box>
                <TextField variant='outlined' size='small' multiline sx={{ width: 'stretch', marginTop: '10px' }} placeholder='METAR message' value={message.text} />
            </Stack>
        </CardBase>
    );
}
export default MetarBox;
