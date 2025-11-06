import { Box, CardHeader, IconButton, Paper, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, Tabs, TextField, Typography } from '@mui/material';
import { StateSnapshot, TableComponents, TableVirtuoso, TableVirtuosoHandle } from 'react-virtuoso';
import { Dispatch, forwardRef, Fragment, memo, ReactNode, SetStateAction, useEffect, useRef, useState } from 'react';
import { Atis, Controller, Pilot, Prefile } from '../../Backend/Network/NetworkWorld';
import NotesIcon from '@mui/icons-material/Notes';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SearchIcon from '@mui/icons-material/Search';
import { NetworkArea, NetworkAtis, NetworkControl, NetworkController, NetworkField } from '../../Backend/Network/ControlRadar';
import { createNetUpdate } from './CardsShared';
import { NetworkPilot } from '../../Backend/Network/TrafficRadar';
import StyledBox from '../Styles/StyledBox';
import RadarPlane from '../../Backend/Radar/RadarPlane';
import { SimulatorStatus } from '../../Backend/Host/HostState';
import { CardCloseButton } from './Elements/CardCloseButton';
import { CardRightToolbar } from './Elements/CardRightToolbar';
import { CardToolbar } from './Elements/CardToolbar';

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

const planeColumns: Column<RadarPlane>[] = [
    {
        width: 80,
        id: 'callsign',
        label: 'Callsign',
        data: data => data.callsign,
        compare: (a, b) => {
            return compareIgnoreCase(a.callsign, b.callsign);
        },
    },
    {
        width: 50,
        id: 'type',
        label: 'Type',
        data: data => {
            return data.model;
        },
        compare: (a, b) => {
            return compareIgnoreCase(a.model, b.model);
        },
        alignData: 'center',
    },
    {
        width: 200,
        id: 'name',
        label: 'Name',
        data: data => data.blip.netState?.pilot.name ?? '- Network feed not available -',
        compare: (a, b) => {
            const one = a.blip.netState;
            const two = b.blip.netState;

            if (!one) {
                if (two) {
                    return -1;
                } else {
                    return 0;
                }
            } else if (!two) {
                return 1;
            }
            return compareIgnoreCase(one.pilot.name, two.pilot.name);
        },
    },
    {
        width: 50,
        id: 'buttons',
        label: '',
        data: data => {
            const disabled = data.blip.netState == null;
            const onClick = () => {
                const pilot = data.blip.netState!;
                cards.showPilotCard(pilot);
            };
            return <IconButton onClick={onClick} size='small' disabled={disabled}><NotesIcon fontSize='small' /></IconButton>;
        },
    },
];

const searchColumns: Column<SearchResult>[] = [
    {
        width: 120,
        id: 'callsign',
        label: 'Callsign',
        data: data => {
            const color = data.markCallsign ? 'error' : undefined;
            return <Typography color={color} variant='inherit'>{data.callsign}</Typography>;
        },
        compare: (a, b) => {
            return compareIgnoreCase(a.callsign, b.callsign);
        },
    },
    {
        width: 100,
        id: 'type',
        label: 'Freq/Type',
        data: data => {
            return data.freq_type;
        },
        compare: (a, b) => {
            return compareIgnoreCase(a.freq_type, b.freq_type);
        },
        alignData: 'center',
    },
    {
        width: 180,
        id: 'name',
        label: 'Name',
        data: data => data.name,
        compare: (a, b) => {
            return compareIgnoreCase(a.name, b.name);
        },
    },
    {
        width: 50,
        id: 'buttons',
        label: '',
        data: data => {
            return <IconButton disabled={!data.onOpen} onClick={data.onOpen} size='small'><NotesIcon fontSize='small' /></IconButton>;
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

function DynamicList<Value>(props: { enabled: boolean, columns: Column<Value>[], values: () => Value[] | undefined, replaceLabel?: string }) {
    const [sortBy, setSortBy] = useState('');
    const [sorter, setSorter] = useState<Sorter<Value>>({ dir: 'asc', compare: () => 0 });
    const table = useRef<TableVirtuosoHandle>(null);
    const tableState = useRef<StateSnapshot>(undefined);

    if (!props.enabled) {
        return <></>;
    }

    const replaceLabel = props.replaceLabel;
    const columns = props.columns;
    const data = replaceLabel ? [] : sortData(props.values(), sorter);

    let replaceContent;
    if (replaceLabel) {
        replaceContent = (
            <Box sx={{ position: 'absolute', height: '100%', width: '100%', pointerEvents: 'none' }}>
                <EmptyList label={replaceLabel} />
            </Box>
        );
    }

    const isScrolling = (scrolling: boolean) => {
        if (scrolling) {
            return;
        }
        table.current?.getState((state) => {
            tableState.current = state;
        });
    };
     
    return (
        <>
            <TableVirtuoso
                data={data}
                components={VirtuosoTableComponents as TableComponents<Value>}
                fixedHeaderContent={createTableHeader(sortBy, setSortBy, sorter, setSorter, columns)}
                itemContent={createTableCell(columns)}
                isScrolling={isScrolling}
                ref={table}
                restoreStateFrom={tableState.current}
            />
            {replaceContent}
        </>
    );
}

function NetworkList<Value>(props: { enabled: boolean, columns: Column<Value>[], values: () => Value[] | undefined }) {
    const label = network.getState() !== undefined ? undefined : 'Network is disabled';
    return <DynamicList enabled={props.enabled} columns={props.columns} values={props.values} replaceLabel={label} />;
}

function PilotList(props: { enabled: boolean }) {
    const data = () => trafficRadar.getPilotList();
    return <NetworkList enabled={props.enabled} columns={pilotColumns} values={data} />;
}

function ControllerList(props: { enabled: boolean }) {
    const data = () => controlRadar.getControllerList();
    return <NetworkList enabled={props.enabled} columns={controllerColumns} values={data} />;
}

function PrefileList(props: { enabled: boolean }) {
    const data = () => network.getState()?.prefiles;
    return <NetworkList enabled={props.enabled} columns={prefileColumns} values={data} />;
}

function ObserverList(props: { enabled: boolean }) {
    const data = () => network.getState()?.observers;
    return <NetworkList enabled={props.enabled} columns={observerColumns} values={data} />;
}

function AtisList(props: { enabled: boolean }) {
    const data = () => controlRadar.getAtisList();
    return <NetworkList enabled={props.enabled} columns={controllerColumns} values={data} />;
}

function LocalPlaneList(props: { enabled: boolean }) {
    const data = () => radar.getPlaneList();
    const label = hostState.getHostStatus().simStatus == SimulatorStatus.Connected ? undefined : 'Simulator is offline';
    return <DynamicList enabled={props.enabled} columns={planeColumns} values={data} replaceLabel={label} />;
}

function EmptyList({ label }: { label: string }) {
    return (
        <Box sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            }}>
            <Typography>{label}</Typography>
        </Box>
    );
}

function ActiveStationList(props: { open: boolean, toolsRight: ReactNode, toolsLeft: ReactNode }) {
    const [tab, setTab] = useState(0);
    const [rev, setRev] = useState(0);

    useEffect(() => {
        if (!props.open) {
            return;
        }
        const onUpdate = () => {
            setRev(rev + 1);
        };

        radar.planeAdded.add(onUpdate);
        radar.planeRemoved.add(onUpdate);
        network.Update.add(onUpdate);
        return () => {
            radar.planeAdded.delete(onUpdate);
            radar.planeRemoved.delete(onUpdate);
            network.Update.delete(onUpdate);
        };
    }, [rev, props.open]);

    const display = props.open ? 'flex' : 'none';
    const tabIdx = props.open ? tab : -1;
    const onClickTab = (_e: unknown, newValue: number) => {
        setTab(newValue);
    };

    return (
        <Box sx={{ display, width: 'stretch', height: '100%', flexDirection: 'column' }}>
            <CardHeader>
                <CardToolbar direction='row'>{props.toolsLeft}</CardToolbar>
                <CardRightToolbar>{props.toolsRight}</CardRightToolbar>
                <Tabs value={tab} onChange={onClickTab} centered>
                    <Tab label='Controllers' />
                    <Tab label='Pilots' />
                    <Tab label='Planes' />
                </Tabs>
            </CardHeader>
            <PilotList enabled={tabIdx == 1} />
            <ControllerList enabled={tabIdx == 0} />
            <LocalPlaneList enabled={tabIdx == 2} />
        </Box>
    );
}

function PassiveStationList(props: { open: boolean, toolsRight: ReactNode, toolsLeft: ReactNode }) {
    const [tab, setTab] = useState(0);
    const [rev, setRev] = useState(0);

    useEffect(() => {
        if (!props.open) {
            return;
        }
        return createNetUpdate(() => {
            setRev(rev + 1);
        });
    }, [rev, props.open]);

    const display = props.open ? 'flex' : 'none';
    const tabIdx = props.open ? tab : -1;
    const onClickTab = (_e: unknown, newValue: number) => {
        setTab(newValue);
    };

    return (
        <Box sx={{ display, width: 'stretch', height: '100%', flexDirection: 'column' }}>
            <CardHeader>
                <CardToolbar direction='row'>{props.toolsLeft}</CardToolbar>
                <CardRightToolbar>{props.toolsRight}</CardRightToolbar>
                <Tabs value={tab} onChange={onClickTab} centered sx={{ display }}>
                    <Tab label='ATIS' />
                    <Tab label='Observers' />
                    <Tab label='Prefiles' />
                </Tabs>
            </CardHeader>
            <PrefileList enabled={tabIdx == 2} />
            <ObserverList enabled={tabIdx == 1} />
            <AtisList enabled={tabIdx == 0} />
        </Box>
    );
}

interface SearchResult {
    callsign: string,
    name: string;
    freq_type: string,
    onOpen?: () => void;
    markCallsign?: boolean;
}

function SearchList(props: { open: boolean, toolsLeft: ReactNode }) {
    const [rev, setRev] = useState(0);
    const [value, setValue] = useState('');

    useEffect(() => {
        if (!props.open) {
            return;
        }
        return createNetUpdate(() => {
            setRev(rev + 1);
        });
    }, [rev, props.open]);

    const display = props.open ? 'flex' : 'none';
    const empty = !props.open || value.length < 3;
    const emptyLabel = empty ? 'You need to type at least 3 characters' : undefined;

    const onChange = (e: { target: { value: string }}) => {
        setValue(e.target.value);
    };

    const data = () => {
        if (value.length < 3) {
            return [];
        }
        let regexp;
        try {
            regexp = new RegExp(value);
        } catch (e) {
            return [];
        }
        const valueUpper = value.toUpperCase();
        const results: SearchResult[] = [];

        const forEachPilotLike = (data: Pilot | Prefile, onCreate: (obj: SearchResult) => void) => {
            const callsign = data.callsign;
            const name = data.name;
            const aircraft = data.flight_plan?.aircraft_short ?? '';
            if (!callsign.includes(valueUpper) &&
                !name.toUpperCase().includes(valueUpper) &&
                !aircraft.includes(valueUpper) &&
                !regexp.test(callsign) &&
                !regexp.test(name) &&
                !regexp.test(aircraft)
            ) {
                return;
            }
            const obj = {
                callsign,
                name,
                freq_type: aircraft,
            };
            onCreate(obj);
            results.push(obj);
        };
        const forEachControllerLike = (data: Controller | Atis, onCreate: (obj: SearchResult) => void) => {
            const callsign = data.callsign;
            const name = data.name;
            const frequency = data.frequency;
            if (!callsign.includes(valueUpper) &&
                !name.toUpperCase().includes(valueUpper) &&
                !frequency.includes(valueUpper) &&
                !regexp.test(callsign) &&
                !regexp.test(name) &&
                !regexp.test(frequency)
            ) {
                return;
            }
            const obj = {
                callsign,
                name,
                freq_type: frequency,
            };
            onCreate(obj);
            results.push(obj);
        };

        const pilots = trafficRadar.getPilotList();
        const controllers = controlRadar.getControllerList();
        const prefiles = network.getState()?.prefiles ?? [];
        const observers = network.getState()?.observers ?? [];
        const atis = controlRadar.getAtisList();

        controllers.forEach(value => {
            forEachControllerLike(value.data, obj => {
                obj.onOpen = () => cards.showControllerCard(value);
                obj.markCallsign = !value.station && !value.substation;
            });
        });
        atis.forEach(value => {
            forEachControllerLike(value.data, obj => {
                obj.onOpen = () => cards.showAtisCard(value);
            });
        });
        pilots.forEach(value => {
            forEachPilotLike(value.pilot, obj => {
                obj.onOpen = () => cards.showPilotCard(value);
            });
        });
        observers.forEach(value => {
            forEachControllerLike(value, obj => {
                obj.onOpen = () => cards.showControllerCard(new NetworkController(value, undefined));
            });
        });
        prefiles.forEach(value => {
            forEachPilotLike(value, obj => {
                obj.onOpen = () => cards.showPrefileCard(value);
            });
        });

        return results;
    };

    return (
        <Box sx={{ display, width: 'stretch', height: '100%', flexDirection: 'column' }}>
            <Box sx={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', minHeight: '48px' }}>
                <Stack direction='row' sx={{ alignItems: 'center', paddingLeft: '2px', paddingRight: '4px', paddingBottom: '3px' }}>
                    {props.toolsLeft}
                </Stack>
                <Box sx={{ flex: '1 1 auto', display: 'flex', alignItems: 'center' }}>
                    <TextField variant='outlined' size='small' sx={{ flex: '1 1 auto' }} onChange={onChange} />
                </Box>
                <Stack direction='row-reverse' sx={{ alignItems: 'center', paddingLeft: '4px', paddingRight: '2px', paddingBottom: '3px' }}>
                    <CardCloseButton />
                </Stack>
            </Box>
            <DynamicList enabled={props.open} columns={searchColumns} values={data} replaceLabel={emptyLabel} />
        </Box>
    );
}

function DataBox(props: { children?: ReactNode, visible?: boolean }) {
    const style = {
        display: props.visible ? 'flex' : 'none',
        width: 530,
        height: '100%',
        alignItems: 'center',
        margin: '15px',
    };
    return <StyledBox sx={style}>{props.children}</StyledBox>;
}

function Scoreboard(props: { open: boolean }) {
    const [row, setRow] = useState(0);
    const [prevRow, setPrevRow] = useState(0);

    let rowButton;
    if (row == 0) {
        rowButton = <IconButton onClick={() => setRow(1)}><ExpandMoreIcon /></IconButton>;
    } else if (row == 1) {
        rowButton = <IconButton onClick={() => setRow(0)}><ExpandLessIcon /></IconButton>;
    }

    const onSwitchSearch = () => {
        if (row == 2) {
            setRow(prevRow);
        } else {
            setPrevRow(row);
            setRow(2);
        }
    };
    const searchIcon = <IconButton onClick={onSwitchSearch}><SearchIcon /></IconButton>;

    return (
        <DataBox visible={props.open}>
            <ActiveStationList open={props.open && row == 0} toolsRight={rowButton} toolsLeft={searchIcon} />
            <PassiveStationList open={props.open && row == 1} toolsRight={rowButton} toolsLeft={searchIcon} />
            <SearchList open={props.open && row == 2} toolsLeft={searchIcon} />
        </DataBox>
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
    }, [facility, refresh]);

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
        <DataBox visible={hasFacility}>
            <CardHeader>
                <CardRightToolbar />
                <Box sx={{ padding: '8px', paddingTop: '6.5px' }}>
                    <Typography variant='h5'>{stationName}</Typography>
                </Box>
            </CardHeader>
            <DynamicList enabled={hasFacility} columns={controllerColumns} values={() => list} />
        </DataBox>
    );
}
export { FacilityStationsList };
