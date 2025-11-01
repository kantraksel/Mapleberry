import { Button, Stack, Tooltip, Typography } from "@mui/material";
import { ReactNode } from "react";
import { CardBase } from "./CardBase";
import { CardHeader } from "./CardHeader";
import { CardLeftToolbar } from "./CardLeftToolbar";
import { CardRightToolbar } from "./CardRightToolbar";

function StationTitle(props: { title: string, absent: boolean, onClick?: () => void }) {
    const style = {
        fontSize: '2.0rem',
        lineHeight: '1.5',
        color: props.absent ? '#8b8b8b' : 'inherit',
    };

    if (props.onClick) {
        return (
            <Tooltip title='Go to blip'>
                <Button sx={{ padding: 0, color: 'inherit' }} onClick={props.onClick}>
                    <Typography variant='h4' sx={style}>{props.title}</Typography>
                </Button>
            </Tooltip>
        );
    }
    return <Typography variant='h4' sx={style}>{props.title}</Typography>;
}

export function StationCard(props: { children?: ReactNode, width: number | string, maxWidth?: number | string, minWidth?: number | string, title: string, absent: boolean, onTitleClick?: () => void, toolsLeft?: ReactNode, toolsRight?: ReactNode }) {
    return (
        <CardBase width={props.width} maxWidth={props.maxWidth ?? 'none'} minWidth={props.minWidth ?? 'auto'}>
            <CardHeader>
                <CardLeftToolbar>{props.toolsLeft}</CardLeftToolbar>
                <CardRightToolbar>{props.toolsRight}</CardRightToolbar>
                <StationTitle title={props.title} absent={props.absent} onClick={props.onTitleClick} />
            </CardHeader>
            <Stack sx={{ paddingLeft: '7px', paddingRight: '7px', alignItems: 'center' }}>
                {props.children}
            </Stack>
        </CardBase>
    );
}
