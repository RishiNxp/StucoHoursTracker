import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TeamMetricsModule } from "../../app/components/TeamMetricsModule";
import type { TeamMetricsResult } from "../../src/analysis/types";

const metrics: TeamMetricsResult = {
  rosterSize: 2,
  totalHours: 3.75,
  participationRate: 100,
  averageHours: 1.88,
  medianHours: 1.88,
  activeVolunteers: 2,
  zeroHourVolunteers: 0,
  completedOpportunities: 2,
  minimumHours: 1.25,
  maximumHours: 2.5,
  periods: [
    { startDate: "2026-08-01", endDate: "2026-08-14", periodHours: 1.25, cumulativeHours: 1.25 },
    { startDate: "2026-08-15", endDate: "2026-08-28", periodHours: 2.5, cumulativeHours: 3.75 },
  ],
};

describe("TeamMetricsModule", () => {
  it("exposes every period range and both hour values in an expandable data table", () => {
    const html = renderToStaticMarkup(createElement(TeamMetricsModule, { teamMetrics: metrics }));

    expect(html).toContain("<details");
    expect(html).toContain("View period data");
    expect(html).toContain("<th scope=\"col\">Period</th>");
    expect(html).toContain("<th scope=\"col\">Period Hours</th>");
    expect(html).toContain("<th scope=\"col\">Cumulative Hours</th>");
    expect(html).toContain("Aug 1, 2026–Aug 14, 2026");
    expect(html).toContain("Aug 15, 2026–Aug 28, 2026");
    expect(html).toContain(">1.25 hours<");
    expect(html).toContain(">2.5 hours<");
    expect(html).toContain(">3.75 hours<");
  });

  it("limits full-year axis labels while retaining the first and last period", () => {
    const periods = Array.from({ length: 27 }, (_, index) => {
      const start = new Date(Date.UTC(2026, 7, 1 + index * 14));
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 13);
      return {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        periodHours: index,
        cumulativeHours: index * 2,
      };
    });
    const html = renderToStaticMarkup(createElement(TeamMetricsModule, {
      teamMetrics: { ...metrics, periods },
    }));
    const axisLabels = html.match(/class="team-chart-x-label"/g) ?? [];

    expect(axisLabels).toHaveLength(7);
    expect(html).toContain('class="team-chart-x-label" x="52"');
    expect(html).toContain(">Aug 1</text>");
    expect(html).toContain(">Jul 31</text>");
    expect(html.match(/class="team-chart-point period-point"/g)).toHaveLength(27);
  });
});
