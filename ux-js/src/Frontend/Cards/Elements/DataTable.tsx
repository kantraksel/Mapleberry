import { Box, Stack, Typography } from "@mui/material";
import { ReactNode } from "react";

export function DataTable(props: { data: ReactNode[][][] }) {
    let i = 0; // ignore react warning - data layout is always fixed
    const parts = props.data.map(part => {
        const columns = part.map(column => {
            const names = column.map(name => {
                if (typeof name === 'string') {
                    return <Typography key={++i}>{name}</Typography>;
                }
                return <Box key={++i}>{name}</Box>;
            });
            return <Stack key={++i}>{names}</Stack>;
        });
        return <Stack useFlexGap direction='row' spacing={1} sx={{ flex: '1 1 auto' }} key={++i}>{columns}</Stack>;
    });
    return <Stack useFlexGap direction='row' spacing={3} sx={{ ml: '7px', mr: '7px', width: 'stretch' }}>{parts}</Stack>;
}
