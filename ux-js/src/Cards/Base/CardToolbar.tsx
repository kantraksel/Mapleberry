import { Stack } from "@mui/material";
import { ReactNode } from "react";

export function CardToolbar(props: { children?: ReactNode, direction: 'row' | 'row-reverse' }) {
    const reverse = props.direction === 'row-reverse';
    const style = {
        position: 'absolute',
        left: reverse ? 'unset' : 0,
        right: reverse ? 0 : 'unset',
        height: '100%',
        alignItems: 'center',
        paddingBottom: `3px`,
        paddingLeft: reverse ? 'unset' : '2px',
        paddingRight: reverse ? '2px' : 'unset',
    };
    return <Stack direction={props.direction} sx={style}>{props.children}</Stack>;
}
