"use client";
import { useState } from "react";
import type { AnalysisViewModel } from "./analysis-types";
import { AnalysisDashboard } from "./components/AnalysisDashboard";
import { AnalysisUploadModal } from "./components/AnalysisUploadModal";
import { HistoryView } from "./components/HistoryView";
import { AnalysisDetailView } from "./components/AnalysisDetailView";
import { OfficersView } from "./components/OfficersView";
type AppTab = "Overview" | "New analysis" | "History" | "Officers";
export default function Home() {
  const [activeTab, setActiveTab] = useState<AppTab>("Overview"), [showUpload, setShowUpload] = useState(false), [analysis, setAnalysis] = useState<AnalysisViewModel | null>(null), [detailId, setDetailId] = useState<string | null>(null);
  const navigate = (tab: AppTab) => { setDetailId(null); setActiveTab(tab); setShowUpload(tab === "New analysis"); };
  const openAnalysis = () => navigate("New analysis");
  return <main className="app-shell"><aside className="sidebar"><div className="brand-lockup"><div className="brand-mark">S</div><div><div className="brand-name">STUCO</div><div className="brand-subtitle">Hours desk</div></div></div><div className="team-switcher"><span className="switcher-label">TEAM</span><div className="team-name">Marquette HS</div></div><nav className="side-nav" aria-label="Primary navigation"><button className={`nav-item ${activeTab === "Overview" ? "active" : ""}`} onClick={() => navigate("Overview")}><span className="nav-icon">◒</span><span>Overview</span></button><button className={`nav-item ${activeTab === "New analysis" ? "active" : ""}`} onClick={() => navigate("New analysis")}><span className="nav-icon">＋</span><span>New analysis</span></button><button className={`nav-item ${activeTab === "History" ? "active" : ""}`} onClick={() => navigate("History")}><span className="nav-icon">↺</span><span>History</span></button><button className={`nav-item ${activeTab === "Officers" ? "active" : ""}`} onClick={() => navigate("Officers")}><span className="nav-icon">◎</span><span>Officers</span></button></nav><div className="sidebar-footer"><div className="rule-card"><div className="rule-card-title">Current analysis</div><div className="rule-card-value">{analysis?.configuration.capHours ?? 25} <span>hours</span></div><div className="rule-card-note">{analysis?.configuration.schoolYearLabel ?? "Choose dates when uploading"}</div></div></div></aside>
    <section className="main-panel"><header className="topbar"><div className="breadcrumb"><span>STUCO</span><b>/</b><strong>{detailId ? "Analysis detail" : activeTab}</strong></div><div className="topbar-actions"><span className="synced"><i /> {analysis?.id ? "Saved to History" : analysis ? "Session-only results" : "Private team workspace"}</span></div></header><div className="content-wrap">{detailId ? <AnalysisDetailView id={detailId} onBack={() => setDetailId(null)} /> : activeTab === "History" ? <HistoryView onSelect={setDetailId} /> : activeTab === "Officers" ? <OfficersView /> : <AnalysisDashboard analysis={analysis} onNewAnalysis={openAnalysis} />}</div></section>
    <AnalysisUploadModal open={showUpload} onClose={() => navigate("Overview")} onSuccess={(result) => { setAnalysis(result); navigate("Overview"); }} />
  </main>;
}
