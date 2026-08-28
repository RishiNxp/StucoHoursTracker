"use client";
import type { TeamMetricsResult } from "../../src/analysis/types";

const number = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
const dateLabel = (date: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
const fullDateLabel = (date: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
const MAX_X_AXIS_LABELS = 7;

function visibleLabelIndexes(periodCount: number) {
  if (periodCount <= MAX_X_AXIS_LABELS) return new Set(Array.from({ length: periodCount }, (_, index) => index));
  return new Set(Array.from(
    { length: MAX_X_AXIS_LABELS },
    (_, index) => Math.round((index * (periodCount - 1)) / (MAX_X_AXIS_LABELS - 1)),
  ));
}

export function TeamMetricsModule({ teamMetrics }: { teamMetrics: TeamMetricsResult }) {
  const metrics = [
    { label: "Total hours", value: number(teamMetrics.totalHours), note: "validated in this school year" },
    { label: "Participation", value: `${number(teamMetrics.participationRate)}%`, note: "roster members with hours" },
    { label: "Average hours", value: number(teamMetrics.averageHours), note: "per roster member" },
    { label: "Median hours", value: number(teamMetrics.medianHours), note: "middle roster value" },
    { label: "Active volunteers", value: number(teamMetrics.activeVolunteers), note: `of ${number(teamMetrics.rosterSize)} rostered` },
    { label: "Zero-hour volunteers", value: number(teamMetrics.zeroHourVolunteers), note: "may need outreach" },
    { label: "Completed opportunities", value: number(teamMetrics.completedOpportunities), note: "distinct validated events" },
    { label: "Hours spread", value: `${number(teamMetrics.minimumHours)}–${number(teamMetrics.maximumHours)}`, note: "minimum to maximum" },
  ];
  const periods = teamMetrics.periods;
  const maxValue = Math.max(1, ...periods.flatMap((period) => [period.periodHours, period.cumulativeHours]));
  const width = 720, height = 272, left = 52, right = 20, top = 25, bottom = 52;
  const chartWidth = width - left - right, chartHeight = height - top - bottom;
  const x = (index: number) => left + (chartWidth * index) / Math.max(periods.length - 1, 1);
  const y = (value: number) => top + chartHeight - (value / maxValue) * chartHeight;
  const points = (key: "periodHours" | "cumulativeHours") => periods.map((period, index) => `${x(index)},${y(period[key])}`).join(" ");
  const yTicks = [0, maxValue / 2, maxValue];
  const labelIndexes = visibleLabelIndexes(periods.length);

  return <section className="team-metrics-module" aria-labelledby="team-metrics-heading">
    <div className="section-heading"><div><h2 id="team-metrics-heading">Team metrics</h2><p>Roster-backed validated activity within this school year.</p></div></div>
    <div className="team-metrics-grid">{metrics.map((metric) => <div className="team-metric-card" key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.note}</small></div>)}</div>
    <div className="team-chart-card">
      <div className="team-chart-heading"><div><h3>Hours over time</h3><p>Biweekly periods remain visible even when no hours were reported.</p></div><div className="team-chart-legend" aria-label="Chart legend"><span className="period-series"><i />Period Hours</span><span className="cumulative-series"><i />Cumulative Hours</span></div></div>
      <svg className="team-metrics-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="team-metrics-chart-title team-metrics-chart-description">
        <title id="team-metrics-chart-title">Team volunteer hours by biweekly period</title>
        <desc id="team-metrics-chart-description">Coral points show Period Hours. Teal points show Cumulative Hours. The chart scale reaches {number(maxValue)} hours. Exact values for every period follow in the period data table.</desc>
        {yTicks.map((tick) => <g className="team-chart-gridline" key={tick}><line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} /><text x={left - 9} y={y(tick) + 4} textAnchor="end">{number(tick)}</text></g>)}
        <line className="team-chart-axis" x1={left} x2={width - right} y1={top + chartHeight} y2={top + chartHeight} />
        <text className="team-chart-axis-label" x="16" y={top + chartHeight / 2} textAnchor="middle" transform={`rotate(-90 16 ${top + chartHeight / 2})`}>Hours</text>
        <text className="team-chart-axis-label" x={left + chartWidth / 2} y={height - 7} textAnchor="middle">Biweekly period</text>
        {periods.length > 0 && <><polyline className="team-chart-line period-line" points={points("periodHours")} /><polyline className="team-chart-line cumulative-line" points={points("cumulativeHours")} /></>}
        <g className="team-chart-x-labels">{periods.map((period, index) => labelIndexes.has(index) ? <text className="team-chart-x-label" key={period.startDate} x={x(index)} y={top + chartHeight + 18} textAnchor="middle">{dateLabel(period.startDate)}</text> : null)}</g>
        {periods.map((period, index) => <g key={`${period.startDate}-points`}><circle className="team-chart-point period-point" cx={x(index)} cy={y(period.periodHours)} r="4"><title>{`${dateLabel(period.startDate)}–${dateLabel(period.endDate)}: ${number(period.periodHours)} Period Hours`}</title></circle><circle className="team-chart-point cumulative-point" cx={x(index)} cy={y(period.cumulativeHours)} r="4"><title>{`${dateLabel(period.startDate)}–${dateLabel(period.endDate)}: ${number(period.cumulativeHours)} Cumulative Hours`}</title></circle></g>)}
      </svg>
      <details className="team-chart-data">
        <summary>View period data</summary>
        <div className="team-period-table-scroll">
          <table>
            <thead><tr><th scope="col">Period</th><th scope="col">Period Hours</th><th scope="col">Cumulative Hours</th></tr></thead>
            <tbody>{periods.map((period) => <tr key={`${period.startDate}-data`}><td>{`${fullDateLabel(period.startDate)}–${fullDateLabel(period.endDate)}`}</td><td>{number(period.periodHours)} hours</td><td>{number(period.cumulativeHours)} hours</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </div>
  </section>;
}
