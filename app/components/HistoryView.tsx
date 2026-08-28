"use client";
import { useEffect, useState } from "react";
import type { AnalysisIssue } from "../analysis-types";
type Item = { id: string; createdAt: string; createdBy: string; schoolYearLabel: string; capHours: number; volunteerCount: number; flaggedOptionalEvents: number; warnings: number };
export function HistoryView({ onSelect }: { onSelect(id: string): void }) {
  const [items, setItems] = useState<Item[]>([]), [error, setError] = useState<AnalysisIssue | null>(null), [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; setLoading(true); fetch("/api/analyses").then(async (response) => { const body = await response.json() as { ok: boolean; analyses?: Item[]; issues?: AnalysisIssue[] }; if (!active) return; if (response.ok && body.ok) setItems(body.analyses ?? []); else setError(body.issues?.[0] ?? { code: "HISTORY_FAILED", message: "History is temporarily unavailable." }); }).catch(() => active && setError({ code: "HISTORY_FAILED", message: "History is temporarily unavailable." })).finally(() => active && setLoading(false)); return () => { active = false; }; }, []);
  if (loading) return <div className="welcome-state"><p className="eyebrow">HISTORY</p><h1>Loading saved analyses…</h1></div>;
  if (error) return <div className="welcome-state"><p className="eyebrow">HISTORY</p><h1>History unavailable</h1><p>{error.message}</p></div>;
  if (!items.length) return <div className="welcome-state"><p className="eyebrow">HISTORY</p><h1>No saved analyses yet.</h1><p>Choose Save to History when you run your next analysis.</p></div>;
  return <div className="history-view"><div className="page-heading"><div><p className="eyebrow">HISTORY</p><h1>Saved analyses.</h1><p className="heading-note">Immutable records for your STUCO team.</p></div></div><div className="history-list">{items.map((item) => <button className="history-item" key={item.id} onClick={() => onSelect(item.id)}><div><strong>{item.schoolYearLabel} analysis</strong><span>{new Date(item.createdAt).toLocaleString()} · {item.createdBy}</span></div><div className="history-stats"><span>{item.volunteerCount} volunteers</span><span>{item.flaggedOptionalEvents} need review</span><b>View →</b></div></button>)}</div></div>;
}
