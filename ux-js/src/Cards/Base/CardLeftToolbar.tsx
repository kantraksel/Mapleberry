import { IconButton } from "@mui/material";
import { CardToolbar } from "./CardToolbar";
import { ReactNode } from "react";
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';

export function CardLeftToolbar(props: { children?: ReactNode }) {
    return (
        <CardToolbar direction='row'>
            <IconButton onClick={() => cards.goBack()}><ArrowBackIosNewIcon /></IconButton>
            {props.children}
        </CardToolbar>
    );
}
