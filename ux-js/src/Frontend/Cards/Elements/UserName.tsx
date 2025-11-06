import { ButtonBase, Stack, Tooltip, Typography } from "@mui/material";
import { useState } from "react";
import PersonSearchIcon from '@mui/icons-material/PersonSearch';

export function UserName({ cid, name }: { cid: number, name: string }) {
    const [copied, setCopied] = useState(false);

    const copyText = copied ? 'Copied' : 'Copy CID';
    const copy = () => {
        navigator.clipboard.writeText(`${cid}`);
        setCopied(true);
    };
    const resetCopy = () => {
        setCopied(false);
    };

    return (
        <Stack direction='row' spacing={1} useFlexGap>
            <Tooltip title={copyText} onOpen={resetCopy}>
                <ButtonBase onClick={copy}>
                    <Typography>{name}</Typography>
                </ButtonBase>
            </Tooltip>
            <Tooltip title='VATSIM Stats'>
                <ButtonBase onClick={() => vatsim.openStats(cid)}>
                    <PersonSearchIcon sx={{ fontSize: '1.2rem' }} />
                </ButtonBase>
            </Tooltip>
        </Stack>
    );
}
