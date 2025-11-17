import { ReactNode, useEffect, useState } from 'react';
import { Box, createTheme, Divider, IconButton, Stack } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import StyledBox from './Styles/StyledBox';
import ViewCanvas, { View, ViewList } from './Options/ViewCanvas';
import useRev from './useRev';

function InfoBox(props: { children?: ReactNode, width: number | string, height: number | string }) {
    const theme = createTheme();
    const container = {
        position: 'absolute',
        minWidth: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: theme.zIndex.drawer + 200,
    };
    const box = {
        width: props.width,
        height: props.height,
        alignItems: 'stretch',
        padding: '5px',
        pointerEvents: 'auto',
    };
    return (
        <Box sx={container}>
            <StyledBox sx={box}>
                {props.children}
            </StyledBox>
        </Box>
    );
}

function OptionsBox(props: { open: boolean, onClose: () => void }) {
    const [state, setState] = useState<View>('network');
    const [rev, addRev] = useRev();

    useEffect(() => {
        options.refreshHook = () => {
            addRev();
        };
    }, [rev]);

    if (!props.open) {
		return <></>;
	}
    return (
        <InfoBox width={600} height={410}>
            <Stack position='absolute' right='5px' direction='row-reverse'>
                <IconButton onClick={props.onClose}><CloseIcon /></IconButton>
            </Stack>
            <Stack flex='1 1' direction='row' alignItems='center' justifyContent='flex-start' spacing={1}>
                <ViewList view={state} onSelect={setState} />
                <Divider orientation='vertical' flexItem />
                <Box flex='1 1' display='flex' alignItems='center' justifyContent='center' padding='10px'>
                    <ViewCanvas view={state} />
                </Box>
            </Stack>
        </InfoBox>
    );
}

export default OptionsBox;
