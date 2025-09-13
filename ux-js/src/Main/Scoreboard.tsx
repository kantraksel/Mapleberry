import { Box, IconButton, Paper, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, Tabs, Typography } from '@mui/material';
import { StateSnapshot, TableComponents, TableVirtuoso, TableVirtuosoHandle } from 'react-virtuoso';
import { Dispatch, forwardRef, Fragment, memo, ReactNode, SetStateAction, useEffect, useRef, useState } from 'react';
import { Controller, Prefile } from '../Network/NetworkWorld';
import NotesIcon from '@mui/icons-material/Notes';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { NetworkArea, NetworkAtis, NetworkControl, NetworkController, NetworkField } from '../Network/ControlRadar';
import { CardHeader, CardRightToolbar, createNetUpdate } from './Cards/CardsShared';
import { NetworkPilot } from '../Network/TrafficRadar';

function InfoBox(props: { children?: ReactNode, width: number | string, height: number | string, visible?: boolean }) {
    return (
        <Box sx={{
            position: 'relative',
            border: `3px solid #2c2c2c`,
            borderRadius: '5px',
            background: '#2c2c2c',
            width: props.width,
            height: props.height,
            margin: '15px',
            display: props.visible ? 'flex' : 'none',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 26px 58px 0 rgba(0, 0, 0, .22), 0 5px 14px 0 rgba(0, 0, 0, .18)',
        }}>
            {props.children}
        </Box>
    );
}

const VirtuosoTableComponents: TableComponents = {
    Scroller: forwardRef<HTMLDivElement>((props, ref) => (
        <TableContainer component={Paper} {...props} ref={ref} sx={{ scrollbarWidth: 'thin', scrollbarColor: 'gray #4C4C4C' }} />
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
    compare?: (a: Type, b: Type) => number,
    alignData?: 'inherit' | 'left' | 'center' | 'right' | 'justify',
}

const pilotColumns: Column<NetworkPilot>[] = [
    {
        width: 65,
        id: 'callsign',
        label: 'Callsign',
        data: data => data.pilot.callsign,
        compare: (a, b) => {
            return compareIgnoreCase(a.pilot.callsign, b.pilot.callsign);
        },
    },
    {
        width: 50,
        id: 'type',
        label: 'Type',
        data: (pilot) => {
            if (!pilot.pilot.flight_plan) {
                return '';
            }
            return pilot.pilot.flight_plan.aircraft_short;
        },
        compare: (a, b) => {
            const one = a.pilot.flight_plan;
            const two = b.pilot.flight_plan;

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
        data: data => data.pilot.name,
        compare: (a, b) => {
            return compareIgnoreCase(a.pilot.name, b.pilot.name);
        },
    },
    {
        width: 50,
        id: 'buttons',
        label: '',
        data: (data) => {
            const onClick = () => {
                cards.showPilotCard(data);
            };
            return <IconButton onClick={onClick} size='small'><NotesIcon fontSize='small' /></IconButton>;
        },
    },
];

const controllerColumns: Column<NetworkController | NetworkAtis>[] = [
    {
        width: 120,
        id: 'callsign',
        label: 'Callsign',
        data: data => {
            const data2 = data as NetworkController;
            const color = data.station || data2.substation ? undefined : 'error';
            return <Typography color={color} variant='inherit'>{data.data.callsign}</Typography>;
        },
        compare: (a, b) => {
            return compareIgnoreCase(a.data.callsign, b.data.callsign);
        },
    },
    {
        width: 100,
        id: 'freq',
        label: 'Frequency',
        data: data => {
            return data.data.frequency;
        },
        compare: (a, b) => {
            return compareIgnoreCase(a.data.frequency, b.data.frequency);
        },
        alignData: 'center',
    },
    {
        width: 180,
        id: 'name',
        label: 'Name',
        data: data => data.data.name,
        compare: (a, b) => {
            return compareIgnoreCase(a.data.name, b.data.name);
        },
    },
    {
        width: 50,
        id: 'buttons',
        label: '',
        data: data => {
            const onClick = () => {
                if (data instanceof NetworkAtis) {
                    cards.showAtisCard(data);
                } else {
                    cards.showControllerCard(data);
                }
            };
            return <IconButton onClick={onClick} size='small'><NotesIcon fontSize='small' /></IconButton>;
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
    {
        width: 50,
        id: 'buttons',
        label: '',
        data: data => {
            const onClick = () => {
                cards.showPrefileCard(data);
            };
            return <IconButton onClick={onClick} size='small'><NotesIcon fontSize='small' /></IconButton>;
        },
    },
];

const observerColumns: Column<Controller>[] = [
    {
        width: 120,
        id: 'callsign',
        label: 'Callsign',
        data: 'callsign',
        compare: (a, b) => compareIgnoreCase(a.callsign, b.callsign),
    },
    {
        width: 100,
        id: 'freq',
        label: 'Frequency',
        data: 'frequency',
        compare: (a, b) => compareIgnoreCase(a.frequency, b.frequency),
        alignData: 'center',
    },
    {
        width: 180,
        id: 'name',
        label: 'Name',
        data: 'name',
        compare: (a, b) => compareIgnoreCase(a.name, b.name),
    },
    {
        width: 50,
        id: 'buttons',
        label: '',
        data: data => {
            const onClick = () => {
                cards.showControllerCard(new NetworkController(data, undefined));
            };
            return <IconButton onClick={onClick} size='small'><NotesIcon fontSize='small' /></IconButton>;
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
            let label;

            if (column.compare) {
                const onClick = () => {
                    const compare = column.compare!;
                    if (sortBy == column.id) {
                        if (sorter.dir == 'asc') {
                            setSorter({ dir: 'desc', compare: (a: Value, b: Value) => { return compare(b, a); } });
                        } else {
                            setSorter({ dir: 'asc', compare: compare });
                        }
                    } else {
                        setSortBy(column.id);
                        setSorter({ dir: 'asc', compare: compare });
                    }
                };
                const dir = sortBy == column.id ? sorter.dir : 'asc';

                label = (
                    <TableSortLabel active={sortBy == column.id} direction={dir} onClick={onClick}>
                        {column.label}
                    </TableSortLabel>
                );
            } else {
                label = <Typography>{column.label}</Typography>;
            }

            return (
                <TableCell
                    key={column.id}
                    variant='head'
                    width={column.width}
                    align={column.alignData ?? 'inherit'}
                    sx={{ backgroundColor: 'background.paper' }}
                >
                    {label}
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
    function tableCell({ values }: { values: Value }) {
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

    const Cell = memo(tableCell);
    return (_index: number, values: Value) => {
        return <Cell values={values} />;
    };
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

function DynamicList<Value>(props: { enabled: boolean, columns: Column<Value>[], values: Value[] | undefined }) {
    const [sortBy, setSortBy] = useState('');
    const [sorter, setSorter] = useState<Sorter<Value>>({ dir: 'asc', compare: () => 0 });
    const table = useRef<TableVirtuosoHandle>(null);
    const tableState = useRef<StateSnapshot>(undefined);

    if (!props.enabled) {
        return <></>;
    }

    const columns = props.columns;
    const data = sortData(props.values, sorter);

    const isScrolling = (scrolling: boolean) => {
        if (scrolling) {
            return;
        }
        table.current?.getState((state) => {
            tableState.current = state;
        });
    };
     
    return (
        <TableVirtuoso
            data={data}
            components={VirtuosoTableComponents as TableComponents<Value>}
            fixedHeaderContent={createTableHeader(sortBy, setSortBy, sorter, setSorter, columns)}
            itemContent={createTableCell(columns)}
            isScrolling={isScrolling}
            ref={table}
            restoreStateFrom={tableState.current}
        />
    );
}

function PilotList(props: { enabled: boolean }) {
    const data = trafficRadar.getPilotList();
    return <DynamicList enabled={props.enabled} columns={pilotColumns} values={data} />;
}

function ControllerList(props: { enabled: boolean }) {
    const data = controlRadar.getControllerList();
    return <DynamicList enabled={props.enabled} columns={controllerColumns} values={data} />;
}

function PrefileList(props: { enabled: boolean }) {
    const state = network.getState();
    return <DynamicList enabled={props.enabled} columns={prefileColumns} values={state?.prefiles} />;
}

function ObserverList(props: { enabled: boolean }) {
    const state = network.getState();
    return <DynamicList enabled={props.enabled} columns={observerColumns} values={state?.observers} />;
}

function AtisList(props: { enabled: boolean }) {
    const data = controlRadar.getAtisList();
    return <DynamicList enabled={props.enabled} columns={controllerColumns} values={data} />;
}

function EmptyList({ enabled }: { enabled: boolean }) {
    if (!enabled) {
        return <></>;
    }

    return (
        <Box sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            }}>
            <Typography>Network is disabled</Typography>
        </Box>
    );
}

function ActiveStationList(props: { open: boolean, toolsRight: ReactNode }) {
    const [tab, setTab] = useState(0);
    const [rev, setRev] = useState(0);

    useEffect(() => {
        return createNetUpdate(() => {
            setRev(rev + 1);
        });
    }, []);

    const display = props.open ? 'flex' : 'none';
    const tabIdx = props.open && network.getState() ? tab : -1;
    const onClickTab = (_e: unknown, newValue: number) => {
        setTab(newValue);
    };

    return (
        <Box sx={{ display, width: 'stretch', height: 'stretch', flexDirection: 'column' }}>
            <CardHeader>
                <CardRightToolbar>{props.toolsRight}</CardRightToolbar>
                <Tabs value={tab} onChange={onClickTab} centered>
                    <Tab label='Controllers' />
                    <Tab label='Pilots' />
                </Tabs>
            </CardHeader>
            <EmptyList enabled={tabIdx == -1} />
            <PilotList enabled={tabIdx == 1} />
            <ControllerList enabled={tabIdx == 0} />
        </Box>
    );
}

function PassiveStationList(props: { open: boolean, toolsRight: ReactNode }) {
    const [tab, setTab] = useState(0);
    const [rev, setRev] = useState(0);

    useEffect(() => {
        return createNetUpdate(() => {
            setRev(rev + 1);
        });
    }, []);

    const display = props.open ? 'flex' : 'none';
    const tabIdx = props.open && network.getState() ? tab : -1;
    const onClickTab = (_e: unknown, newValue: number) => {
        setTab(newValue);
    };

    return (
        <Box sx={{ display, width: 'stretch', height: 'stretch', flexDirection: 'column' }}>
            <CardHeader>
                <CardRightToolbar>{props.toolsRight}</CardRightToolbar>
                <Tabs value={tab} onChange={onClickTab} centered sx={{ display }}>
                    <Tab label='ATIS' />
                    <Tab label='Observers' />
                    <Tab label='Prefiles' />
                </Tabs>
            </CardHeader>
            <EmptyList enabled={tabIdx == -1} />
            <PrefileList enabled={tabIdx == 2} />
            <ObserverList enabled={tabIdx == 1} />
            <AtisList enabled={tabIdx == 0} />
        </Box>
    );
}

function Scoreboard(props: { open: boolean }) {
    const [row, setRow] = useState(0);

    let rowButton;
    if (row == 0) {
        rowButton = <IconButton onClick={() => setRow(1)}><ExpandMoreIcon /></IconButton>;
    } else if (row == 1) {
        rowButton = <IconButton onClick={() => setRow(0)}><ExpandLessIcon /></IconButton>;
    }

    return (
        <InfoBox width={530} height='100%' visible={props.open}>
            <ActiveStationList open={props.open && row == 0} toolsRight={rowButton} />
            <PassiveStationList open={props.open && row == 1} toolsRight={rowButton} />
        </InfoBox>
    );
}

export default Scoreboard;

function FacilityStationsList() {
    const [refresh, setRefresh] = useState(0);
    const [facility, setFacility] = useState<NetworkControl>();
    const hasFacility = facility != undefined;

    useEffect(() => {
        cards.facilityRef = setFacility;
        return () => {
            cards.facilityRef = undefined;
        };
    }, []);

    useEffect(() => {
        if (!facility) {
            return;
        }
        const icao = facility.icao;
        const onUpdate = () => {
            setRefresh(refresh + 1);
            setFacility(controlRadar.getStation(icao));
        };
        controlRadar.Update.add(onUpdate);
        return () => {
            controlRadar.Update.delete(onUpdate);
        };
    }, [facility]);

    let list: (NetworkController | NetworkAtis)[] | undefined;
    let stationName = '';
    if (facility) {
        if (facility instanceof NetworkArea) {
            list = facility.controllers;
            stationName = facility.station.name;
        } else if (facility instanceof NetworkField) {
            list = [...facility.controllers, ...facility.atis];
            stationName = facility.station.name;
        }
    }

    return (
        <InfoBox width={530} height='100%' visible={hasFacility}>
            <CardHeader>
                <CardRightToolbar />
                <Box sx={{ padding: '8px', paddingTop: '6.5px' }}>
                    <Typography variant='h5'>{stationName}</Typography>
                </Box>
            </CardHeader>
            <DynamicList enabled={hasFacility} columns={controllerColumns} values={list} />
        </InfoBox>
    );
}
export { FacilityStationsList };
