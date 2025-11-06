import { Stack, SxProps, Theme } from "@mui/material";
import { ReactNode } from "react";

function StyledBox({ children, sx }: { children: ReactNode, sx?: SxProps<Theme> }) {
    const style = [
        {
            background: '#2c2c2c',
            border: '3px solid #2c2c2c',
            borderRadius: '5px',
            boxShadow: '0 26px 58px 0 rgba(0, 0, 0, .22), 0 5px 14px 0 rgba(0, 0, 0, .18)',
            position: 'relative',
        },
        ...(Array.isArray(sx) ? sx : [ sx ]),
    ];
    return <Stack sx={style}>{children}</Stack>
}
export default StyledBox;
