import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { VaccineEntry, VaccinePhase } from '../types';
import { getVaccinePhaseLabel } from '../types';
import { toVaccineSlug, toVirusSlug } from '../utils/drugSlug';

interface VaccineTableProps {
  data: VaccineEntry[];
  onRowClick?: (v: VaccineEntry) => void;
}

const columnHelper = createColumnHelper<VaccineEntry>();

export function VaccineTable({ data, onRowClick }: VaccineTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });

  const columns = useMemo(
    () => [
      columnHelper.accessor('vaccine', {
        header: 'Vaccine',
        cell: (info) => (
          <Link
            to={`/vaccine/${toVaccineSlug(info.row.original.vddbId)}`}
            className="drug-name drug-name-link"
            onClick={(e) => e.stopPropagation()}
          >
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor('virusShort', {
        header: 'Target Virus',
        cell: (info) => {
          const virus = info.getValue();
          return (
            <Link
              to={`/virus/${toVirusSlug(virus)}`}
              className="virus-badge"
              onClick={(e) => e.stopPropagation()}
              style={{ textDecoration: 'none' }}
            >
              {virus}
            </Link>
          );
        },
      }),
      columnHelper.accessor('type', {
        header: 'Type',
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('maxPhase', {
        id: 'maxPhase',
        header: 'Max Phase',
        cell: (info) => {
          const phase = info.getValue() as VaccinePhase | 'na';
          if (phase === 'na') return <span className="phase-badge phase-preclinical">—</span>;
          const steps: (VaccinePhase | 'na')[] = ['na', 'phase1', 'phase2', 'phase3', 'approved'];
          const progress = ((steps.indexOf(phase)) / 4) * 100;
          return (
            <div className="phase-cell">
              <span className={`phase-badge phase-${phase === 'approved' ? 'approved' : phase}`}>
                {getVaccinePhaseLabel(phase)}
              </span>
              <div className="phase-progress-bar">
                <div
                  className={`phase-progress-fill phase-fill-${phase === 'approved' ? 'approved' : phase}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor('approved', {
        header: 'Approved',
        cell: (info) =>
          info.getValue() ? (
            <span className="approval-badge" title="Phase 4 reached (post-marketing)">P4</span>
          ) : (
            '—'
          ),
      }),
      columnHelper.accessor((row) => row.trials.length, {
        id: 'trialCount',
        header: 'Trials',
        cell: (info) => {
          const count = info.getValue() as number;
          const ncts = info.row.original.trials.map((t) => t.nctId).join(', ');
          return <span title={ncts}>{count}</span>;
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="drug-table-container">
      <div className="table-wrapper">
        <table className="drug-table">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id}>
                    {header.isPlaceholder ? null : (
                      <button
                        className={`header-sort ${header.column.getCanSort() ? 'sortable' : ''}`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className="sort-icon">
                            {{
                              asc: <ArrowUp size={14} />,
                              desc: <ArrowDown size={14} />,
                            }[header.column.getIsSorted() as string] ?? <ArrowUpDown size={14} />}
                          </span>
                        )}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row.original)}
                className={onRowClick ? 'clickable' : ''}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-pagination">
        <div className="pagination-info">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            data.length
          )}{' '}
          of {data.length.toLocaleString()} vaccines
        </div>
        <div className="pagination-controls">
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="page-size-select"
          >
            {[10, 25, 50, 100].map((s) => (
              <option key={s} value={s}>
                {s} per page
              </option>
            ))}
          </select>
          <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="pagination-btn">
            <ChevronLeft size={18} />
          </button>
          <span className="page-indicator">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="pagination-btn">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
