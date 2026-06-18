import type { Plugin } from 'vite';

const ENHANCED_SOFTWARE_HELPERS = String.raw`
  const getSoftwareRowSearchText = (row: SoftwareInventoryRow) => [
    row.softwareName,
    row.category,
    row.classification,
    row.productGroup,
    row.deviceName,
    row.deviceId,
    row.branch,
    row.version,
    row.publisher,
    row.lifecycleStatus,
    row.supportStatus,
    row.riskLevel,
    row.recommendation,
  ].map((value) => String(value || '').toLowerCase()).join(' ');

  const getSoftwareEvidenceRows = () => Array.isArray(software.softwareRows) ? software.softwareRows : [];

  const uniqueSoftwareRows = (rows: SoftwareInventoryRow[]) => {
    const seen = new Set<string>();
    return rows.filter((row) => {
      const key = [row.softwareName, row.publisher, row.version].map((value) => String(value || '').trim().toLowerCase()).join('|');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const softwareMajorFamilyMatches = (row: SoftwareInventoryRow, family: string) => {
    const text = getSoftwareRowSearchText(row);
    if (family === 'Microsoft Office') return /microsoft\s+office|\boffice\s*(2016|2019|2021|2024|365)?\b|word|excel|powerpoint|outlook|access|visio|project/.test(text) && !/microsoft\s*365|office\s*365/.test(text);
    if (family === 'Microsoft 365') return /microsoft\s*365|office\s*365|m365|teams|onedrive|sharepoint/.test(text);
    if (family === 'Adobe') return /adobe|acrobat|creative cloud|photoshop|illustrator|premiere|lightroom|indesign/.test(text);
    if (family === 'Google Chrome') return /google chrome|\bchrome\b|google update/.test(text);
    if (family === 'Firefox') return /mozilla firefox|\bfirefox\b/.test(text);
    return text.includes(family.toLowerCase());
  };

  const softwareClassificationMatches = (row: SoftwareInventoryRow, selected: string) => {
    const text = getSoftwareRowSearchText(row);
    if (selected.includes('business')) return /business|productivity|microsoft|office|microsoft\s*365|adobe|acrobat|autocad|sap|oracle|account|finance|hr|payroll/.test(text);
    if (selected.includes('remote')) return /remote|teamviewer|anydesk|vnc|ultravnc|realvnc|tightvnc|rustdesk|dameware|bomgar|beyondtrust|screenconnect|connectwise/.test(text);
    if (selected.includes('antivirus') || selected.includes('anti-virus')) return /antivirus|anti-virus|endpoint protection|defender|sophos|symantec|mcafee|kaspersky|trend micro|crowdstrike|sentinelone|bitdefender|eset|avast/.test(text);
    if (selected.includes('browser') || selected.includes('web')) return /browser|chrome|firefox|edge|brave|opera|safari|vivaldi/.test(text);
    if (selected.includes('gaming') || selected.includes('game')) return /game|gaming|steam|epic games|riot|valorant|garena|battle.net|blizzard|ea app|origin|ubisoft/.test(text);
    if (selected.includes('unclassified')) return /unclassified|unknown|uncategorized|not classified|pending classification/.test(text) || !String(row.classification || row.category || '').trim();
    return false;
  };

  const softwareLifecycleMatches = (row: SoftwareInventoryRow, selected: string) => {
    const text = getSoftwareRowSearchText(row);
    if (selected.includes('eol') || selected.includes('eos') || selected.includes('watch')) return /eol|eos|end of life|end of support|near|expired|unsupported/.test(text);
    if (selected.includes('unsupported')) return /unsupported|expired|end of life|end of support/.test(text);
    if (selected.includes('supported')) return /supported|active|maintained/.test(text) && !/unsupported|not supported|expired|eol|eos/.test(text);
    if (selected.includes('not found') || selected.includes('not mapped') || selected.includes('not checked')) return /not found|not mapped|not checked|unknown|pending|lifecycle not found/.test(text);
    return false;
  };

  const resolveSoftwareEvidenceRows = (item = '') => {
    const selected = String(item || '').trim().toLowerCase();
    const rows = getSoftwareEvidenceRows();

    if (!selected || selected.includes('install')) return rows;
    if (selected.includes('unique software')) return uniqueSoftwareRows(rows);

    const majorFamilies = ['Microsoft Office', 'Microsoft 365', 'Adobe', 'Google Chrome', 'Firefox'];
    const matchedFamily = majorFamilies.find((family) => selected.includes(family.toLowerCase()));
    if (matchedFamily) return rows.filter((row) => softwareMajorFamilyMatches(row, matchedFamily));

    return rows.filter((row) => {
      const values = getSoftwareRowSearchText(row);
      if (softwareClassificationMatches(row, selected)) return true;
      if (softwareLifecycleMatches(row, selected)) return true;
      return values.includes(selected);
    });
  };

  const buildSoftwareGraphRows = (rows: SoftwareInventoryRow[], config: { label: string; target: string; note: string; tone: CardTone; matcher: (row: SoftwareInventoryRow) => boolean }[]) => config.map((item) => ({
    ...item,
    value: rows.filter(item.matcher).length,
  }));

  const renderSoftwareGraphRows = (rows: { label: string; value: number; target: string; note: string; tone: CardTone }[], total: number) => {
    const maxValue = Math.max(1, ...rows.map((row) => numberOrFallback(row.value)));
    return (
      <div style={{ display: 'grid', gap: 10 }}>
        {rows.map((row) => {
          const value = numberOrFallback(row.value);
          const width = maxValue > 0 ? Math.max(6, (value / maxValue) * 100) : 6;
          const share = total > 0 ? (value / total) * 100 : 0;
          return (
            <button
              type="button"
              key={row.label}
              onClick={() => openLevel3('software', row.target)}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(160px, .7fr) minmax(180px, 1fr) 82px',
                alignItems: 'center',
                gap: 12,
                minHeight: 54,
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                background: '#fff',
                color: '#0f172a',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 950 }}>{row.label}</strong>
                <span style={{ display: 'block', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b', fontSize: 11, fontWeight: 800 }}>{row.note}</span>
              </div>
              <em style={{ display: 'block', height: 10, overflow: 'hidden', borderRadius: 999, background: '#e2e8f0' }}>
                <i style={{ display: 'block', width: `\${width}%`, height: '100%', borderRadius: 999, background: row.tone === 'red' ? 'linear-gradient(90deg,#ef4444,#f97316)' : row.tone === 'amber' ? 'linear-gradient(90deg,#f59e0b,#facc15)' : row.tone === 'green' ? 'linear-gradient(90deg,#14b8a6,#22c55e)' : row.tone === 'purple' ? 'linear-gradient(90deg,#7c3aed,#38bdf8)' : 'linear-gradient(90deg,#0ea5e9,#38bdf8)' }} />
              </em>
              <div style={{ textAlign: 'right' }}>
                <strong style={{ display: 'block', fontSize: 16, fontWeight: 950 }}>{formatNumber(value)}</strong>
                <span style={{ color: '#64748b', fontSize: 10, fontWeight: 850 }}>{formatPercent(share, 0)}</span>
              </div>
            </button>
          );
        })}
        {!rows.length && <EmptyState label="No software graph data yet." />}
      </div>
    );
  };

  const renderSoftwareAnalyticsGraphs = () => {
    const rows = getSoftwareEvidenceRows();
    const total = rows.length || numberOrFallback(software.totalInstallations);

    const classificationRows = buildSoftwareGraphRows(rows, [
      { label: 'Business Software', target: 'Business Software', note: 'Microsoft, Adobe and business tools', tone: 'green', matcher: (row) => softwareClassificationMatches(row, 'business') },
      { label: 'Remote Control', target: 'Remote Control', note: 'AnyDesk, TeamViewer, VNC and remote tools', tone: 'red', matcher: (row) => softwareClassificationMatches(row, 'remote') },
      { label: 'Antivirus', target: 'Antivirus', note: 'Endpoint protection and AV tools', tone: 'cyan', matcher: (row) => softwareClassificationMatches(row, 'antivirus') },
      { label: 'Web Browsers', target: 'Web Browsers', note: 'Chrome, Edge, Firefox and browsers', tone: 'blue', matcher: (row) => softwareClassificationMatches(row, 'browser') },
      { label: 'Gaming Software', target: 'Gaming Software', note: 'Non-business gaming applications', tone: 'amber', matcher: (row) => softwareClassificationMatches(row, 'gaming') },
      { label: 'Unclassified', target: 'Unclassified', note: 'Pending cleanup or classification', tone: 'amber', matcher: (row) => softwareClassificationMatches(row, 'unclassified') },
    ]);

    const majorRows = buildSoftwareGraphRows(rows, [
      { label: 'Microsoft Office', target: 'Microsoft Office', note: 'Office client and desktop apps', tone: 'blue', matcher: (row) => softwareMajorFamilyMatches(row, 'Microsoft Office') },
      { label: 'Microsoft 365', target: 'Microsoft 365', note: 'M365, Teams, OneDrive and cloud apps', tone: 'purple', matcher: (row) => softwareMajorFamilyMatches(row, 'Microsoft 365') },
      { label: 'Adobe', target: 'Adobe', note: 'Acrobat and Creative Cloud family', tone: 'red', matcher: (row) => softwareMajorFamilyMatches(row, 'Adobe') },
      { label: 'Google Chrome', target: 'Google Chrome', note: 'Chrome browser family', tone: 'green', matcher: (row) => softwareMajorFamilyMatches(row, 'Google Chrome') },
      { label: 'Firefox', target: 'Firefox', note: 'Mozilla Firefox family', tone: 'amber', matcher: (row) => softwareMajorFamilyMatches(row, 'Firefox') },
    ]);

    const lifecycleRows = [
      { label: 'Supported', target: 'Supported', note: 'Lifecycle supported applications', tone: 'green' as CardTone, value: rows.filter((row) => softwareLifecycleMatches(row, 'supported')).length },
      { label: 'EOL/EOS Watch', target: 'EOL/EOS Watch', note: 'Near EOL, EOS or expired support', tone: 'amber' as CardTone, value: numberOrFallback(software.eolApplications) + numberOrFallback(software.eosApplications) },
      { label: 'Unsupported Apps', target: 'Unsupported Apps', note: 'Unsupported or expired application support', tone: 'red' as CardTone, value: numberOrFallback(software.unsupportedApplications) },
      { label: 'Lifecycle Not Found', target: 'Lifecycle Not Found', note: 'No lifecycle lookup mapping yet', tone: 'purple' as CardTone, value: rows.filter((row) => softwareLifecycleMatches(row, 'not found')).length },
    ];

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, alignItems: 'stretch' }}>
        <Panel title="Software Classification Graph" subtitle="Business, remote, antivirus, browser, gaming and unclassified software." icon={BarChart3}>
          {renderSoftwareGraphRows(classificationRows, total)}
        </Panel>
        <Panel title="Major Software EOL/EOS Graph" subtitle="Microsoft Office, Microsoft 365, Adobe, Google Chrome and Firefox." icon={CalendarDays}>
          {renderSoftwareGraphRows(majorRows, total)}
        </Panel>
        <Panel title="Lifecycle Exposure Graph" subtitle="Supported, watch list, unsupported and not mapped applications." icon={ShieldAlert}>
          {renderSoftwareGraphRows(lifecycleRows, total)}
        </Panel>
      </div>
    );
  };

  const renderSoftwareLevel2Analytics = () => (
    <div className="itops-pro-drawer-stack">
      <DrilldownTrace domain="Software" stage="breakdown" />
      <div className="itops-pro-story-panel">
        <strong>Software Estate & Application Lifecycle</strong>
        <p>Review software category, major application lifecycle and EOL/EOS exposure first. Click any graph row to open the matching software list.</p>
      </div>

      <div className="itops-pro-drill-grid">
        <DrillCard icon={Database} label="Installations" value={formatNumber(software.totalInstallations)} note="Total software records" tone="purple" onClick={() => openLevel3('software', 'Installations')} />
        <DrillCard icon={Database} label="Unique Software" value={formatNumber(software.uniqueSoftware)} note="Unique titles only" tone="blue" onClick={() => openLevel3('software', 'Unique Software')} />
        <DrillCard icon={AlertTriangle} label="Unclassified" value={formatNumber(software.unclassifiedSoftware)} note="Needs cleanup/classification" tone="amber" onClick={() => openLevel3('software', 'Unclassified')} />
        <DrillCard icon={Layers3} label="Business Software" value={formatNumber(software.businessSoftware)} note="Microsoft, Adobe and business tools" tone="green" onClick={() => openLevel3('software', 'Business Software')} />
        <DrillCard icon={Wrench} label="Remote Control" value={formatNumber(software.remoteControlSoftware)} note="Remote access tools detected" tone="red" onClick={() => openLevel3('software', 'Remote Control')} />
        <DrillCard icon={ShieldCheck} label="Antivirus" value={formatNumber(software.antivirusSoftware)} note="Endpoint protection tools" tone="cyan" onClick={() => openLevel3('software', 'Antivirus')} />
        <DrillCard icon={Network} label="Web Browsers" value={formatNumber(software.browserSoftware)} note="Chrome, Edge, Firefox and browser tools" tone="blue" onClick={() => openLevel3('software', 'Web Browsers')} />
        <DrillCard icon={AlertTriangle} label="Gaming Software" value={formatNumber(software.gamingSoftware)} note="Non-business game software" tone="amber" onClick={() => openLevel3('software', 'Gaming Software')} />
      </div>

      {renderSoftwareAnalyticsGraphs()}

      <Panel title="Major Application Lifecycle Details" subtitle="Lifecycle records returned by backend lookup." icon={CalendarDays}>
        {renderSoftwareLifecycleCards()}
      </Panel>

      <Panel title="Software Categories" subtitle="Click a category to open matching software records." icon={Database}>
        {renderBreakdownDrillCards(software.topCategories, 'software', 'No software category data yet.')}
      </Panel>
    </div>
  );

  const renderSoftwareInventoryTable`;

const ENHANCED_SOFTWARE_LEVEL2 = String.raw`    if (view === 'software') {
      return renderSoftwareLevel2Analytics();
    }

    if (view === 'network') {`;

export function itopsSoftwareDrilldownTransform(): Plugin {
  return {
    name: 'itops-software-drilldown-transform',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').endsWith('/src/pages/Dashboard.tsx')) return null;

      let next = code;

      next = next.replace(
        /  const resolveSoftwareEvidenceRows = \(item = ''\) => \{[\s\S]*?\n  \};\n\n  const renderSoftwareInventoryTable/,
        ENHANCED_SOFTWARE_HELPERS,
      );

      next = next.replace(
        /    if \(view === 'software'\) \{[\s\S]*?\n    \}\n\n    if \(view === 'network'\) \{/,
        ENHANCED_SOFTWARE_LEVEL2,
      );

      if (next === code) return null;
      return { code: next, map: null };
    },
  };
}
