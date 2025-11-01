import { Box } from "@mui/material";
import { ReactNode } from "react";

export function CardHeader(props: { children?: ReactNode }) {
    return <Box sx={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>{props.children}</Box>;
}
