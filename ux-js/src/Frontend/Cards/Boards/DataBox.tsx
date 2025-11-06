import { ReactNode } from "react";
import StyledBox from "../../Styles/StyledBox";

export default function DataBox(props: { children?: ReactNode, visible?: boolean }) {
    const style = {
        display: props.visible ? 'flex' : 'none',
        width: 530,
        height: '100%',
        alignItems: 'center',
        margin: '15px',
    };
    return <StyledBox sx={style}>{props.children}</StyledBox>;
}
