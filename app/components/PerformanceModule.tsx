"use client";
import { useMemo, useState } from "react";
import { sortPerformanceStudents } from "../../src/analysis/performance";
import type { PerformanceGroup, PerformanceResult, PerformanceSortKey } from "../../src/analysis/types";

const sections: Array<{ group: PerformanceGroup; title: string; note: string }> = [
  { group: "top", title: "Top performers", note: "Highest relative activity" },
  { group: "steady", title: "Steady performers", note: "Middle of the current distribution" },
  { group: "developing", title: "Developing performers", note: "May benefit from outreach" },
];
const number = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);

export function PerformanceModule({ performance }: { performance: PerformanceResult }) {
  const [sortKey, setSortKey] = useState<PerformanceSortKey>("combinedScore");
  const sorted = useMemo(() => sortPerformanceStudents(performance.students, sortKey), [performance.students, sortKey]);
  return <section className="performance-module"><div className="section-heading"><div><h2>Roster performance</h2><p>Relative activity across everyone in the uploaded roster; ties remain together.</p></div><label className="performance-sort">Sort by <select value={sortKey} onChange={(event) => setSortKey(event.target.value as PerformanceSortKey)}><option value="combinedScore">Combined score</option><option value="validatedHours">Validated hours</option><option value="completedOpportunities">Completed opportunities</option><option value="name">Name</option></select></label></div>
    <div className="performance-grid">{sections.map((section) => { const students = sorted.filter((student) => student.group === section.group); return <div className={`performance-group ${section.group}`} key={section.group}><div className="performance-group-heading"><div><h3>{section.title}</h3><p>{section.note}</p></div><strong>{performance.summary[section.group]}</strong></div>{students.length === 0 ? <div className="performance-empty">No students in this group.</div> : <div className="performance-list">{students.map((student) => <div className="performance-student" key={student.volunteerKey}><div className="performance-name"><strong>{student.name}</strong><span>{student.email ?? "No email provided"}</span></div><div><strong>{number(student.validatedHours)}</strong><span>Validated hours</span></div><div><strong>{student.completedOpportunities}</strong><span>Completed opportunities</span></div><div><strong>{number(student.combinedScore)}</strong><span>Combined score</span></div></div>)}</div>}</div>; })}</div>
  </section>;
}
