import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import type { AntiviralEntry, ClinicalPhase } from '../types';
import { getClinicalPhase } from '../types';

interface PipelineChartProps {
  drugs: AntiviralEntry[];
  chartType?: 'bar' | 'pie' | 'funnel';
}

const PHASE_COLORS: Record<ClinicalPhase, string> = {
  preclinical: '#94a3b8',
  phase2: '#60a5fa',
  phase3: '#34d399',
  approved: '#22c55e',
};

export function PipelineChart({ drugs, chartType = 'bar' }: PipelineChartProps) {
  const phaseData = useMemo(() => {
    const counts: Record<ClinicalPhase, number> = {
      preclinical: 0,
      phase2: 0,
      phase3: 0,
      approved: 0,
    };

    drugs.forEach((drug) => {
      const phase = getClinicalPhase(drug);
      counts[phase]++;
    });

    return [
      { phase: 'preclinical', name: 'Preclinical', count: counts.preclinical, color: PHASE_COLORS.preclinical },
      { phase: 'phase2', name: 'Phase 2', count: counts.phase2, color: PHASE_COLORS.phase2 },
      { phase: 'phase3', name: 'Phase 3', count: counts.phase3, color: PHASE_COLORS.phase3 },
      { phase: 'approved', name: 'Approved', count: counts.approved, color: PHASE_COLORS.approved },
    ];
  }, [drugs]);

  const virusData = useMemo(() => {
    const virusCounts: Record<string, number> = {};
    drugs.forEach((drug) => {
      virusCounts[drug.virusShort] = (virusCounts[drug.virusShort] || 0) + 1;
    });

    return Object.entries(virusCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([virus, count]) => ({
        virus,
        count,
      }));
  }, [drugs]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="chart-tooltip">
        <p className="tooltip-label">{label || payload[0].name}</p>
        <p className="tooltip-value">
          {payload[0].value.toLocaleString()} drug-virus pairs
        </p>
      </div>
    );
  };

  if (chartType === 'pie') {
    return (
      <div className="pipeline-chart">
        <h3>Clinical Phase Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={phaseData}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name, percent }) =>
                `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
            >
              {phaseData.map((entry) => (
                <Cell key={entry.phase} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="pipeline-charts">
      {/* Phase Distribution */}
      <div className="pipeline-chart">
        <h3>Clinical Development Pipeline</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={phaseData} layout="vertical">
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={100} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {phaseData.map((entry) => (
                <Cell key={entry.phase} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Viruses */}
      <div className="pipeline-chart">
        <h3>Top 10 Target Viruses</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={virusData} layout="vertical">
            <XAxis type="number" />
            <YAxis type="category" dataKey="virus" width={80} tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface PipelineStatsProps {
  drugs: AntiviralEntry[];
}

export function PipelineStats({ drugs }: PipelineStatsProps) {
  const stats = useMemo(() => {
    const uniqueDrugs = new Set(drugs.map((d) => d.drug)).size;
    const uniqueViruses = new Set(drugs.map((d) => d.virusShort)).size;
    const fdaApproved = drugs.filter((d) => d.approvals.fda).length;
    const phase3 = drugs.filter((d) => d.phase3Initiated).length;

    return { uniqueDrugs, uniqueViruses, fdaApproved, phase3 };
  }, [drugs]);

  return (
    <div className="pipeline-stats">
      <div className="stat-card">
        <div className="stat-value">{stats.uniqueDrugs.toLocaleString()}</div>
        <div className="stat-label">Unique Drugs</div>
      </div>
      <Link to="/viral-families" className="stat-card stat-card-link">
        <div className="stat-value">{stats.uniqueViruses.toLocaleString()}</div>
        <div className="stat-label">Target Viruses</div>
      </Link>
      <div className="stat-card">
        <div className="stat-value">{drugs.length.toLocaleString()}</div>
        <div className="stat-label">Drug-Virus Pairs</div>
      </div>
      <div className="stat-card stat-approved">
        <div className="stat-value">{stats.fdaApproved.toLocaleString()}</div>
        <div className="stat-label">FDA Approved</div>
      </div>
    </div>
  );
}
