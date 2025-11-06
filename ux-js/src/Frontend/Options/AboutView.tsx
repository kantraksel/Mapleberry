import { Divider, Link, Stack, Typography } from "@mui/material";

export default function AboutView() {
    return (
        <Stack flex='1 1' alignItems='center' spacing={2}>
            <Stack alignItems='center' spacing={1}>
                <Typography variant='h5'>Mapleberry 0.X</Typography>
                <Typography sx={{ fontFamily: 'Helvetica', fontStyle: 'italic' }}>Because paying is a crime</Typography>
                <Typography>(to be updated)</Typography>
            </Stack>
            <Divider flexItem />
            <Stack alignItems='center' spacing={1}>
                <Link target='_blank' href='https://github.com/kantraksel/Mapleberry' underline='hover'>GitHub: kantraksel/Mapleberry</Link>
            </Stack>
        </Stack>
  );
}
