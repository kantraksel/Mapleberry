import { Box, Paper, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, Tabs } from '@mui/material';
import { TableComponents, TableVirtuoso } from 'react-virtuoso';
import React, { ReactNode, SyntheticEvent, useState } from 'react';
import { Pilot } from '../Network/VATSIM';

function InfoBox(props: { children?: ReactNode, width: number | string, height: number | string }) {
    const style = {
        border: `3px solid #2c2c2c`,
        borderRadius: '5px',
        background: '#2c2c2c',
        width: props.width,
        height: props.height,
        margin: '15px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    };
    return (
        <Box sx={style}>
            {props.children}
        </Box>
    );
}

const VirtuosoTableComponents: TableComponents<Pilot> = {
    Scroller: React.forwardRef<HTMLDivElement>((props, ref) => (
        <TableContainer component={Paper} {...props} ref={ref} />
    )),
    Table: (props) => (
        <Table {...props} sx={{ borderCollapse: 'separate', tableLayout: 'fixed' }} />
    ),
    TableHead: React.forwardRef<HTMLTableSectionElement>((props, ref) => (
        <TableHead {...props} ref={ref} />
    )),
    TableRow,
    TableBody: React.forwardRef<HTMLTableSectionElement>((props, ref) => (
        <TableBody {...props} ref={ref} />
    )),
};

interface ColumnFormat {
    width: number,
    id: string,
    label: string,
    data: ((pilot: Pilot) => ReactNode) | string,
    compare: (a: Pilot, b: Pilot) => number,
}

const columns: ColumnFormat[] = [
    {
        width: 65,
        id: 'callsign',
        label: 'Callsign',
        data: 'callsign',
        compare: (a, b) => {
            return compareIgnoreCase(a.callsign, b.callsign);
        },
    },
    {
        width: 50,
        id: 'type',
        label: 'Type',
        data: (pilot) => {
            if (!pilot.flight_plan) {
                return '';
            }
            return pilot.flight_plan.aircraft_short;
        },
        compare: (a, b) => {
            const one = a.flight_plan;
            const two = b.flight_plan;

            if (!one) {
                if (two) {
                    return -1;
                } else {
                    return 0;
                }
            } else if (!two) {
                return 1;
            }
            return compareIgnoreCase(one.aircraft_short, two.aircraft_short);
        },
    },
    {
        width: 200,
        id: 'name',
        label: 'Name',
        data: 'name',
        compare: (a, b) => {
            return compareIgnoreCase(a.name, b.name);
        },
    },
];

function compareIgnoreCase(a: string, b: string) {
    a = a.toLowerCase();
    b = b.toLowerCase();
    if (a < b) {
        return -1;
    } else if (a > b) {
        return 1;
    } else {
        return 0;
    }
}

function tableCell(_index: number, data: Pilot) {
    const items = columns.map((column) => {
        let value;
        const type = typeof column.data;
        if (type === 'string') {
            value = data[column.data as keyof Pilot] as string | number ?? '!undef!';
        } else if (type === 'function') {
            const fn = column.data as (pilot: Pilot) => ReactNode;
            value = fn(data);
        }
        return (
            <TableCell key={column.id}>
                {value}
            </TableCell>
        );
    });

    return (
        <React.Fragment>
            {items}
        </React.Fragment>
    )
}

function Scoreboard(props: { open: boolean }) {
    const [sortBy, setSortBy] = useState('');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [sorter, setSorter] = useState<(a: Pilot, b: Pilot) => number>(() => () => 0);
    const [tab, setTab] = useState(0);

    if (!props.open) {
        return <></>;
    }

    function tableHeader() {
        const items = columns.map((column) => {
            const onClick = () => {
                if (sortBy == column.id) {
                    if (sortDir == 'asc') {
                        setSortDir('desc');
                    } else {
                        setSortDir('asc');
                    }
                } else {
                    setSortBy(column.id);
                    setSortDir('asc');
                    setSorter(() => column.compare);
                }
            };
            const dir = sortBy == column.id ? sortDir : 'asc';

            return (
                <TableCell
                    key={column.id}
                    variant='head'
                    style={{ width: column.width }}
                    sx={{ backgroundColor: 'background.paper' }}
                >
                    <TableSortLabel active={sortBy == column.id} direction={dir} onClick={onClick}>
                        {column.label}
                    </TableSortLabel>
                </TableCell>
            )});
        
        return (
            <TableRow>
                {items}
            </TableRow>
        );
    }

    const data = vatsim.getNetworkData();
    const sortedData = [...data?.pilots ?? []].sort((a, b) => {
        if (a === undefined || a === null) {
            if (b === undefined || b === null) {
                return 0;
            } else {
                return -1;
            }
        } else if (b === undefined || b === null) {
            return 1;
        }

        if (sortDir == 'desc') {
            const c = a;
            a = b;
            b = c;
        }
        return sorter(a, b);
    });

    const onClickTab = (_e: SyntheticEvent, newValue: number) => {
        setTab(newValue);
    };

    return (
        <InfoBox width={430} height={'100%'}>
            <Tabs value={tab} onChange={onClickTab} centered>
                <Tab label='Pilots' />
                <Tab label='Controllers' disabled />
                <Tab label='Prefiles' disabled />
            </Tabs>
            <Paper style={{ height: '100%', width: '100%' }}>
                <TableVirtuoso
                    height={400}
                    data={sortedData}
                    components={VirtuosoTableComponents}
                    fixedHeaderContent={tableHeader}
                    itemContent={tableCell}
                />
            </Paper>
        </InfoBox>
    );
}

export default Scoreboard;
