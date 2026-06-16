const roiRows = [
  { label: "Unused licence reclaim", value: 48240 },
  { label: "Low usage app saving", value: 6840 },
  { label: "Renewal review value", value: 4320 },
];

const total = roiRows.reduce((sum, row) => sum + row.value, 0);
const rm = (value: number) => `RM ${value.toLocaleString()}`;

export default function ReportBoard() {
  const max = Math.max(...roiRows.map((row) => row.value), 1);
  return (
    <main style={{ minHeight: "100vh", padding: 24, background: "#f6f8fb", color: "#0b2447" }}>
      <section style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0 }}>Report Builder</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontWeight: 700 }}>ROI Software report for sales and client review.</p>
        </div>
        <button onClick={() => window.print()} style={{ height: 38, border: 0, borderRadius: 12, padding: "0 18px", background: "#16a34a", color: "#fff", fontWeight: 900 }}>Generate PDF</button>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "280px minmax(0, 1fr)", gap: 18 }}>
        <aside style={{ background: "#fff", border: "1px solid #dbe7f6", borderRadius: 18, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Report Packs</h3>
          <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 16, padding: 16 }}>
            <strong>ROI Software</strong>
            <p style={{ marginBottom: 0, color: "#64748b", fontWeight: 700 }}>Savings opportunity, licence utilisation and reclaim value.</p>
          </div>
        </aside>

        <article style={{ background: "#fff", border: "1px solid #dbe7f6", borderRadius: 18, padding: 24 }}>
          <small style={{ color: "#16a34a", fontWeight: 900, letterSpacing: ".12em" }}>SOFTWARE ROI REPORT</small>
          <h2 style={{ marginTop: 8 }}>ROI Software Dashboard</h2>
          <p style={{ color: "#475569", fontWeight: 700 }}>Estimated total ROI opportunity is <b>{rm(total)}</b>. This view helps sales explain reclaim value, low usage saving and renewal review value in one client-ready report.</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, margin: "22px 0" }}>
            {[
              ["Total ROI", rm(total)],
              ["Licence Utilisation", "72%"],
              ["Unused Seats", "268"],
              ["Low Usage Apps", "38"],
            ].map(([label, value]) => (
              <div key={label} style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, background: "#fbfdff" }}>
                <small style={{ color: "#64748b", fontWeight: 900 }}>{label}</small>
                <h2 style={{ margin: "6px 0 0" }}>{value}</h2>
              </div>
            ))}
          </div>

          <h3>Chart: ROI Software Value Breakdown</h3>
          {roiRows.map((row) => (
            <div key={row.label} style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900 }}><span>{row.label}</span><span>{rm(row.value)}</span></div>
              <div style={{ height: 14, background: "#e9eef7", borderRadius: 99, overflow: "hidden", marginTop: 8 }}>
                <div style={{ height: "100%", width: `${Math.max(8, Math.round((row.value / max) * 100))}%`, background: "linear-gradient(90deg,#22c55e,#0ea5e9)" }} />
              </div>
            </div>
          ))}

          <h3 style={{ marginTop: 26 }}>Recommended Action Plan</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={{ textAlign: "left", padding: 10, background: "#f1f6ff" }}>Priority</th><th style={{ textAlign: "left", padding: 10, background: "#f1f6ff" }}>Action</th><th style={{ textAlign: "left", padding: 10, background: "#f1f6ff" }}>Owner</th></tr></thead>
            <tbody>
              <tr><td style={{ padding: 10, borderBottom: "1px solid #e5edf7" }}>Priority 1</td><td style={{ padding: 10, borderBottom: "1px solid #e5edf7" }}>Validate 268 unused licence seats before renewal.</td><td style={{ padding: 10, borderBottom: "1px solid #e5edf7" }}>Software Asset Manager</td></tr>
              <tr><td style={{ padding: 10, borderBottom: "1px solid #e5edf7" }}>Priority 2</td><td style={{ padding: 10, borderBottom: "1px solid #e5edf7" }}>Review 38 low usage applications with business owners.</td><td style={{ padding: 10, borderBottom: "1px solid #e5edf7" }}>Application Owner</td></tr>
            </tbody>
          </table>
        </article>
      </section>
    </main>
  );
}
