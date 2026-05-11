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
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import type { AntiviralEntry, ClinicalPhase } from '../types';
import { getClinicalPhase, getPhaseLabel, getApprovalRegions, PHASE_RANK } from '../types';
import { toDrugSlug, toVirusSlug } from '../utils/drugSlug';
import { parseReferenceIdentifiers, type RefLink } from '../utils/parseReferenceIdentifiers';

interface DrugTableProps {
  data: AntiviralEntry[];
  onRowClick?: (drug: AntiviralEntry) => void;
  showResearcherColumns?: boolean;
}

const columnHelper = createColumnHelper<AntiviralEntry>();

// Collect up to `limit` reference links from the entry's references fields, in priority
// order (approval > phase3 > phase2 > drugvirusInfo). Deduplicates by URL/label.
function collectRefLinks(entry: AntiviralEntry, limit: number): RefLink[] {
  const sources = [
    entry.references.approval,
    entry.references.phase3,
    entry.references.phase2,
    entry.references.drugvirusInfo,
  ];
  const seen = new Set<string>();
  const out: RefLink[] = [];
  for (const src of sources) {
    if (!src) continue;
    for (const ref of parseReferenceIdentifiers(src)) {
      const key = ref.url ?? `label:${ref.label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(ref);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

export function DrugTable({ data, onRowClick, showResearcherColumns = false }: DrugTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });

  const columns = useMemo(() => {
    const baseColumns = [
      columnHelper.accessor('drug', {
        header: 'Drug Name',
        cell: (info) => (
          <Link
            to={`/drug/${toDrugSlug(info.row.original.drugNormalized)}`}
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
      columnHelper.accessor('mechanism', {
        header: 'Mechanism',
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor(
        (row) => getClinicalPhase(row),
        {
          id: 'phase',
          header: 'Phase',
          sortingFn: (a, b, columnId) => {
            const av = a.getValue<ClinicalPhase>(columnId);
            const bv = b.getValue<ClinicalPhase>(columnId);
            return PHASE_RANK[av] - PHASE_RANK[bv];
          },
          sortDescFirst: true,
          cell: (info) => {
            const phase = info.getValue() as ClinicalPhase;
            const progress = ((PHASE_RANK[phase] + 1) / 5) * 100;
            return (
              <div className="phase-cell">
                <span className={`phase-badge phase-${phase}`}>
                  {getPhaseLabel(phase)}
                </span>
                <div className="phase-progress-bar">
                  <div
                    className={`phase-progress-fill phase-fill-${phase}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            );
          },
        }
      ),
      columnHelper.accessor(
        (row) => getApprovalRegions(row),
        {
          id: 'approvals',
          header: 'Approvals',
          cell: (info) => {
            const regions = info.getValue() as string[];
            if (regions.length === 0) return '—';
            return (
              <div className="approval-badges">
                {regions.map((region) => (
                  <span key={region} className="approval-badge">
                    {region}
                  </span>
                ))}
              </div>
            );
          },
        }
      ),
    ];

    if (showResearcherColumns) {
      return [
        ...baseColumns,
        columnHelper.accessor('target', {
          header: 'Target',
          cell: (info) => info.getValue() || '—',
        }),
        columnHelper.display({
          id: 'links',
          header: 'Links',
          cell: (info) => {
            const row = info.row.original;
            const refs = collectRefLinks(row, 3);
            if (refs.length === 0) {
              return <span className="external-links" style={{ color: '#9ca3af' }}>—</span>;
            }
            return (
              <div className="external-links">
                {refs.map((ref, i) =>
                  ref.url ? (
                    <a
                      key={`${ref.url}-${i}`}
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={ref.label}
                      className="external-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {ref.label}
                      <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span key={`${ref.label}-${i}`} className="external-link" title={ref.label}>
                      {ref.label}
                    </span>
                  )
                )}
              </div>
            );
          },
        }),
      ];
    }

    return baseColumns;
  }, [showResearcherColumns]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableSortingRemoval: false,
  });

  return (
    <div className="drug-table-container">
      <div className="table-wrapper">
        <table className="drug-table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id}>
                    {header.isPlaceholder ? null : (
                      <button
                        className={`header-sort ${
                          header.column.getCanSort() ? 'sortable' : ''
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getCanSort() && (
                          <span className="sort-icon">
                            {{
                              asc: <ArrowUp size={14} />,
                              desc: <ArrowDown size={14} />,
                            }[header.column.getIsSorted() as string] ?? (
                              <ArrowUpDown size={14} />
                            )}
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
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="table-pagination">
        <div className="pagination-info">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            data.length
          )}{' '}
          of {data.length.toLocaleString()} results
        </div>
        <div className="pagination-controls">
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
            className="page-size-select"
          >
            {[10, 25, 50, 100].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize} per page
              </option>
            ))}
          </select>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="pagination-btn"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="page-indicator">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="pagination-btn"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
