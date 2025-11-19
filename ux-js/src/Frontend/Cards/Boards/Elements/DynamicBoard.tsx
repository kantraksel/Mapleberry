import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, Typography } from "@mui/material";
import { Dispatch, forwardRef, Fragment, memo, ReactNode, SetStateAction, useRef, useState } from "react";
import { StateSnapshot, TableComponents, TableVirtuoso, TableVirtuosoHandle } from "react-virtuoso";

export default function DynamicBoard<Value>(props: { enabled: boolean, columns: Column<Value>[], values: () => Value[] | undefined, replaceLabel?: string }) {
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
                <EmptyBoard label={replaceLabel} />
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
                    <TableSortLabel active={sortBy == column.id} direction={dir} onClick={onClick} sx={{ marginRight: '-18px' }}>
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

function EmptyBoard({ label }: { label: string }) {
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

export type { Column };
