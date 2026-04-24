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
import { getClinicalPhase, getPhaseLabel, getApprovalRegions } from '../types';
import { toDrugSlug, toVirusSlug } from '../utils/drugSlug';

interface DrugTableProps {
  data: AntiviralEntry[];
  onRowClick?: (drug: AntiviralEntry) => void;
  showResearcherColumns?: boolean;
}

const columnHelper = createColumnHelper<AntiviralEntry>();

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
          cell: (info) => {
            const phase = info.getValue() as ClinicalPhase;
            const steps: ClinicalPhase[] = ['preclinical', 'phase2', 'phase3', 'approved'];
            const progress = ((steps.indexOf(phase) + 1) / steps.length) * 100;
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
            return (
              <div className="external-links">
                {row.pubchemCid && (
                  <a
                    href={`https://pubchem.ncbi.nlm.nih.gov/compound/${row.pubchemCid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="PubChem"
                    className="external-link"
                  >
                    PubChem
                    <ExternalLink size={12} />
                  </a>
                )}
                {row.drugbankId && (
                  <a
                    href={`https://go.drugbank.com/drugs/${row.drugbankId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="DrugBank"
                    className="external-link"
                  >
                    DrugBank
                    <ExternalLink size={12} />
                  </a>
                )}
                <a
                  href={`https://clinicaltrials.gov/search?term=${encodeURIComponent(row.drug)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="ClinicalTrials.gov"
                  className="external-link"
                >
                  Trials
                  <ExternalLink size={12} />
                </a>
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
