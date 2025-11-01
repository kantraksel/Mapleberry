import { ReactNode } from "react";
import StyledBox from "../../Styles/StyledBox";

export function CardBase(props: { children?: ReactNode, width: number | string, maxWidth: number | string, minWidth: number | string }) {
    const style = {
        width: props.width,
        maxWidth: props.maxWidth,
        minWidth: props.minWidth,
        margin: '15px',
        paddingBottom: '7px',
        zIndex: 5,
    };
    return <StyledBox sx={style}>{props.children}</StyledBox>;
}
