import { ReactNode } from 'react';
import { Box } from '@mui/material';

function InfoBox(props: { children?: ReactNode, width: number | string }) {
    const style = {
        border: `3px solid #333333`,
        borderRadius: '5px',
        background: '#333333',
        width: props.width,
        marginTop: '15px',
        marginLeft: '15px',
        marginRight: '15px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    };
    return (
        <Box sx={style}>
            {props.children}
        </Box>
    );
}

export default InfoBox;
