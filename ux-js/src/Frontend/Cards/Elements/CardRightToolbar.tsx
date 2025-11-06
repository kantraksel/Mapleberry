import { ReactNode } from "react";
import { CardToolbar } from "./CardToolbar";
import { CardCloseButton } from "./CardCloseButton";

export function CardRightToolbar(props: { children?: ReactNode }) {
    return (
        <CardToolbar direction='row-reverse'>
            <CardCloseButton />
            {props.children}
        </CardToolbar>
    );
}
