import { Box, Paper, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, Tabs } from '@mui/material';
import { TableComponents, TableVirtuoso } from 'react-virtuoso';
import { Dispatch, forwardRef, Fragment, ReactNode, SetStateAction, SyntheticEvent, useEffect, useState } from 'react';
import { Controller, LiveNetworkData, Pilot, Prefile } from '../Network/VATSIM';

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

const VirtuosoTableComponents: TableComponents = {
    Scroller: forwardRef<HTMLDivElement>((props, ref) => (
        <TableContainer component={Paper} {...props} ref={ref} />
    )),
    Table: (props) => (
        <Table {...props} sx={{ borderCollapse: 'separate', tableLayout: 'fixed' }} />
    ),
    TableHead: forwardRef<HTMLTableSectionElement>((props, ref) => (
        <TableHead {...props} ref={ref} />
    )),
    TableRow,
    TableBody: forwardRef<HTMLTableSectionElement>((props, ref) => (
        <TableBody {...props} ref={ref} />
    )),
};

interface Column<Type> {
    width: number,
    id: string,
    label: string,
    data: ((pilot: Type) => ReactNode) | string,
    compare: (a: Type, b: Type) => number,
    alignData?: 'inherit' | 'left' | 'center' | 'right' | 'justify',
}

const pilotColumns: Column<Pilot>[] = [
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
        alignData: 'center',
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

const controllerColumns: Column<Controller>[] = [
    {
        width: 120,
        id: 'callsign',
        label: 'Callsign',
        data: 'callsign',
        compare: (a, b) => {
            return compareIgnoreCase(a.callsign, b.callsign);
        },
    },
    {
        width: 100,
        id: 'freq',
        label: 'Frequency',
        data: (pilot) => {
            return pilot.frequency;
        },
        compare: (a, b) => {
            return compareIgnoreCase(a.frequency, b.frequency);
        },
        alignData: 'center',
    },
    {
        width: 180,
        id: 'name',
        label: 'Name',
        data: 'name',
        compare: (a, b) => {
            return compareIgnoreCase(a.name, b.name);
        },
    },
];

const prefileColumns: Column<Prefile>[] = [
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
        alignData: 'center',
    },
    {
        width: 200,
        id: 'cid',
        label: 'CID',
        data: 'cid',
        compare: (a, b) => {
            return a.cid - b.cid;
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

function createTableHeader<Value>(sortBy: string, setSortBy: Dispatch<SetStateAction<string>>, sorter: Sorter<Value>, setSorter: Dispatch<SetStateAction<Sorter<Value>>>, columns: Column<Value>[]) {
    return function tableHeader() {
        const items = columns.map((column) => {
            const onClick = () => {
                if (sortBy == column.id) {
                    if (sorter.dir == 'asc') {
                        setSorter({ dir: 'desc', compare: (a: Value, b: Value) => { return column.compare(b, a); } });
                    } else {
                        setSorter({ dir: 'asc', compare: column.compare });
                    }
                } else {
                    setSortBy(column.id);
                    setSorter({ dir: 'asc', compare: column.compare });
                }
            };
            const dir = sortBy == column.id ? sorter.dir : 'asc';
            const align = column.alignData ?? 'inherit';

            return (
                <TableCell
                    key={column.id}
                    variant='head'
                    width={column.width}
                    align={align}
                    sx={{ backgroundColor: 'background.paper' }}
                >
                    <TableSortLabel active={sortBy == column.id} direction={dir} onClick={onClick}>
                        {column.label}
                    </TableSortLabel>
                </TableCell>
            );
        });
        
        return (
            <TableRow>
                {items}
            </TableRow>
        );
    }
}

function createTableCell<Value>(columns: Column<Value>[]) {
    return function tableCell(_index: number, values: Value) {
        const items = columns.map((column) => {
            let value;
            const type = typeof column.data;
            if (type === 'string') {
                value = values[column.data as keyof Value] as string | number ?? '!undef!';
            } else if (type === 'function') {
                const fn = column.data as (pilot: Value) => ReactNode;
                value = fn(values);
            }
            const align = column.alignData ?? 'inherit';
            return (
                <TableCell key={column.id} align={align}>
                    {value}
                </TableCell>
            );
        });

        return (
            <Fragment>
                {items}
            </Fragment>
        );
    }
}

interface Sorter<Value> {
    dir: 'asc' | 'desc',
    compare: (a: Value, b: Value) => number,
}

function sortData<Value>(values: Value[] | undefined, sorter: Sorter<Value>) {
    return [...values ?? []].sort((a, b) => {
        if (a === undefined || a === null) {
            if (b === undefined || b === null) {
                return 0;
            } else {
                return -1;
            }
        } else if (b === undefined || b === null) {
            return 1;
        }
        return sorter.compare(a, b);
    });
}

function DynamicList<Value>(props: { selected: boolean, columns: Column<Value>[], values: Value[] | undefined }) {
    const [sortBy, setSortBy] = useState('');
    const [sorter, setSorter] = useState<Sorter<Value>>({ dir: 'asc', compare: () => 0 });

    if (!props.selected) {
        return <></>;
    }

    const columns = props.columns;
    const data = sortData(props.values, sorter);
     
    return (
        <TableVirtuoso
            data={data}
            components={VirtuosoTableComponents as TableComponents<Value>}
            fixedHeaderContent={createTableHeader(sortBy, setSortBy, sorter, setSorter, columns)}
            itemContent={createTableCell(columns)}
        />
    );
}

function PilotList(props: { selected: boolean, netData?: LiveNetworkData }) {
    return <DynamicList selected={props.selected} columns={pilotColumns} values={props.netData?.pilots} />;
}

function ControllerList(props: { selected: boolean, netData?: LiveNetworkData }) {
    return <DynamicList selected={props.selected} columns={controllerColumns} values={props.netData?.controllers} />;
}

function PrefileList(props: { selected: boolean, netData?: LiveNetworkData }) {
    return <DynamicList selected={props.selected} columns={prefileColumns} values={props.netData?.prefiles} />;
}

function Scoreboard(props: { open: boolean }) {
    const [tab, setTab] = useState(0);
    const [netData, setNetData] = useState(vatsim.getNetworkData());

    useEffect(() => {
        const handler = (networkData?: LiveNetworkData) => {
            setNetData(networkData);
        };
        vatsim.Update.add(handler);
        return () => {
            vatsim.Update.delete(handler);
        };
    }, []);

    if (!props.open) {
        return <></>;
    }

    const onClickTab = (_e: SyntheticEvent, newValue: number) => {
        setTab(newValue);
    };

    return (
        <InfoBox width={430} height={'100%'}>
            <Tabs value={tab} onChange={onClickTab} centered>
                <Tab label='Pilots' />
                <Tab label='Controllers' />
                <Tab label='Prefiles' />
            </Tabs>
            <Paper style={{ height: '100%', width: '100%' }}>
                <PilotList selected={tab == 0} netData={netData} />
                <ControllerList selected={tab == 1} netData={netData} />
                <PrefileList selected={tab == 2} netData={netData} />
            </Paper>
        </InfoBox>
    );
}

export default Scoreboard;
