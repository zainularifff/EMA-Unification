import { useEffect, useMemo, useState } from "react";
import {
  EmaButton,
  EmaFilterField,
  EmaKpiCard,
  EmaKpiGrid,
  EmaPageLayout,
  EmaPagination,
  EmaSearchInput,
  EmaSection,
  EmaSidebarActionButton,
  EmaSidebarPanel,
  EmaSidebarTreeRow,
  EmaTable,
  EmaTableShell,
  EmaToolbar,
  EmaToastViewport,
  type EmaTableColumn,
} from "../components/ema";
import {
  Activity,
  Database,
  Download,
  FolderTree,
  Globe2,
  Link2,
  ListTree,
  MousePointerClick,
  Plus,
  RefreshCw,
  Search,
  Timer,
  Trash2,
} from "lucide-react";
import internetMeteringService from "../services/internetMeteringService";

type NodeKind = "all" | "folder" | "device" | "url-folder" | "url";

type TreeNodeType = {
  id: string;
  label: string;
  type: NodeKind;
  children?: TreeNodeType[];
  objectRelIdn?: number;
  objectRootIdn?: number;
  objectDeviceID?: string;
  urlMainIdn?: number;
  url?: string;
  restrict?: number;
  count?: number;
  raw?: unknown;
};

type InternetUsageRow = {
  id: number;
  domainName: string;
  urlMainIdn: number;
  usedTime: number;
  counts: number;
  device: string;
  date: string;
  raw?: unknown;
};

type InternetStats = {
  totalRecords: number;
  totalDomains: number;
  totalUsageSeconds: number;
  totalCounts: number;
};

type MeteringAction = "start" | "collect" | "stop";

const WEB_METERING_JOB_TYPE = 10300;
const WEB_METERING_START_COMMAND = 1404;
const WEB_METERING_COLLECT_COMMAND = 1407;
const WEB_METERING_STOP_COMMAND = 1409;
const URL_RULE_PAGE_SIZE = 10;

const todayIso = () => new Date().toISOString().slice(0, 10);

const daysAgoIso = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function extractArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const record = asRecord(payload);
  if (Array.isArray(record.data)) return record.data as T[];
  const nestedData = asRecord(record.data);
  if (Array.isArray(nestedData.data)) return nestedData.data as T[];
  if (Array.isArray(record.result)) return record.result as T[];
  if (Array.isArray(record.results)) return record.results as T[];
  if (Array.isArray(record.recordset)) return record.recordset as T[];
  if (Array.isArray(record.rows)) return record.rows as T[];
  return [];
}

function textFrom(row: unknown, keys: string[], fallback = "") {
  const record = asRecord(row);
  const keyMap = new Map(Object.keys(record).map((key) => [key.toLowerCase(), key]));
  for (const key of keys) {
    const actualKey = keyMap.get(key.toLowerCase()) || key;
    const value = record[actualKey];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
  }
  return fallback;
}

function numberFrom(row: unknown, keys: string[], fallback = 0) {
  const value = textFrom(row, keys, "");
  if (!value) return fallback;
  const parsed = Number.parseInt(value.replace(/,/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-MY").format(Number(value) || 0);
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(Number(seconds) || 0, 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

function normalizeDate(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString("en-MY", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeUsageRows(payload: unknown): InternetUsageRow[] {
  const rows = extractArray<Record<string, unknown>>(payload);
  return rows.map((row, index) => {
    const urlMainIdn = numberFrom(row, ["URLMain_Idn", "UrlMain_Idn", "urlMainIdn", "URLID", "urlID", "id"], index + 1);
    return {
      id: numberFrom(row, ["id", "RowNo", "No"], index + 1),
      domainName: textFrom(row, ["DomainName", "Domain", "URL", "Url", "Site", "WebSite", "Name"], "-"),
      urlMainIdn,
      usedTime: numberFrom(row, ["UsedTime", "UseTime", "Duration", "Seconds", "TotalSeconds"], 0),
      counts: numberFrom(row, ["Counts", "Count", "Hits", "TotalCount"], 0),
      device: textFrom(row, ["ComputerName", "DeviceName", "ClientName", "Username", "UserName"], "-"),
      date: normalizeDate(textFrom(row, ["Date", "UsedDate", "CreatedTime", "UpdateTime", "LastUpdate"], "")),
      raw: row,
    };
  });
}

function normalizeStats(payload: unknown, fallbackRows: InternetUsageRow[]): InternetStats {
  const record = asRecord(payload);
  const rows = extractArray<Record<string, unknown>>(payload);
  const source = rows[0] || record;
  const totalRecords = numberFrom(source, ["totalRecords", "TotalRecords", "Total", "Count"], fallbackRows.length);
  const totalDomains = numberFrom(source, ["totalDomains", "TotalDomains", "DomainCount"], new Set(fallbackRows.map((row) => row.domainName)).size);
  const totalUsageSeconds = numberFrom(source, ["totalUsageSeconds", "TotalUsageSeconds", "UsedTime", "Duration"], fallbackRows.reduce((sum, row) => sum + row.usedTime, 0));
  const totalCounts = numberFrom(source, ["totalCounts", "TotalCounts", "Counts", "Hits"], fallbackRows.reduce((sum, row) => sum + row.counts, 0));
  return { totalRecords, totalDomains, totalUsageSeconds, totalCounts };
}

function normalizeDepartmentNodes(payload: unknown): TreeNodeType[] {
  const rows = extractArray<Record<string, unknown>>(payload);
  return rows.map((row, index) => {
    const relationId = numberFrom(row, ["Object_Rel_Idn", "objectRelIdn", "RelationID", "id"], index + 1);
    const label = textFrom(row, ["Object_Rel_Name", "Object_Full_Name", "label", "name"], `Branch ${relationId}`);
    return {
      id: `branch-${relationId}`,
      label,
      type: "folder",
      objectRelIdn: relationId,
      count: numberFrom(row, ["TotalDevices", "DeviceCount", "count"], 0),
      raw: row,
    };
  });
}

function normalizeUrlNodes(payload: unknown): TreeNodeType[] {
  const rows = extractArray<Record<string, unknown>>(payload);
  return rows.map((row, index) => {
    const urlMainIdn = numberFrom(row, ["URLMain_Idn", "UrlMain_Idn", "urlMainIdn", "URLID", "urlID", "id"], index + 1);
    const label = textFrom(row, ["DomainName", "Domain", "URL", "Url", "Name", "label"], `URL ${urlMainIdn}`);
    const restrict = numberFrom(row, ["Restrict", "restrict", "IsRestricted", "Blocked"], 0);
    return {
      id: `url-${urlMainIdn}`,
      label,
      type: "url",
      urlMainIdn,
      url: textFrom(row, ["URL", "Url", "DomainName", "Domain"], label),
      restrict,
      count: numberFrom(row, ["Count", "TotalCount", "Hits"], 0),
      raw: row,
    };
  });
}

function flattenNodes(nodes: TreeNodeType[]): TreeNodeType[] {
  return nodes.flatMap((node) => [node, ...(node.children ? flattenNodes(node.children) : [])]);
}

function filterNodes(nodes: TreeNodeType[], query: string): TreeNodeType[] {
  const term = query.trim().toLowerCase();
  if (!term) return nodes;
  return nodes
    .map((node) => {
      const children = node.children ? filterNodes(node.children, term) : [];
      const matched = node.label.toLowerCase().includes(term) || String(node.url || "").toLowerCase().includes(term);
      if (!matched && children.length === 0) return null;
      return { ...node, children };
    })
    .filter(Boolean) as TreeNodeType[];
}

function buildActionPayload(node: TreeNodeType | null) {
  return {
    Job_Type: WEB_METERING_JOB_TYPE,
    Object_Rel_Idn: node?.objectRelIdn,
    Object_Root_Idn: node?.objectRootIdn,
    Object_DeviceID: node?.objectDeviceID,
    URLMain_Idn: node?.urlMainIdn ?? -1,
    urlID: node?.urlMainIdn ?? -1,
  };
}

function getActionCommand(action: MeteringAction) {
  if (action === "start") return WEB_METERING_START_COMMAND;
  if (action === "stop") return WEB_METERING_STOP_COMMAND;
  return WEB_METERING_COLLECT_COMMAND;
}

function EmaSpinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex min-h-[12rem] items-center justify-center gap-3 rounded-xl bg-white text-sm font-extrabold text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
      <span>{label}</span>
    </div>
  );
}

export default function InternetMetering() {
  const [branchNodes, setBranchNodes] = useState<TreeNodeType[]>([]);
  const [urlNodes, setUrlNodes] = useState<TreeNodeType[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState("all");
  const [sidebarTab, setSidebarTab] = useState<"branches" | "urls">("branches");
  const [treeSearch, setTreeSearch] = useState("");
  const [usageRows, setUsageRows] = useState<InternetUsageRow[]>([]);
  const [stats, setStats] = useState<InternetStats>({ totalRecords: 0, totalDomains: 0, totalUsageSeconds: 0, totalCounts: 0 });
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(daysAgoIso(7));
  const [toDate, setToDate] = useState(todayIso());
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [treeLoading, setTreeLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [actionLoading, setActionLoading] = useState<MeteringAction | null>(null);

  const rootNode: TreeNodeType = useMemo(
    () => ({
      id: "all",
      label: "All Internet Metering",
      type: "all",
      children: [
        { id: "branches", label: "Branches", type: "folder", children: branchNodes },
        { id: "urls", label: "URL Rules", type: "url-folder", children: urlNodes },
      ],
    }),
    [branchNodes, urlNodes],
  );

  const branchRoot: TreeNodeType = useMemo(() => ({ id: "all", label: "All Branches", type: "all", children: branchNodes }), [branchNodes]);
  const urlRoot: TreeNodeType = useMemo(() => ({ id: "urls", label: "URL Rules", type: "url-folder", children: urlNodes }), [urlNodes]);
  const allNodes = useMemo(() => flattenNodes([rootNode]), [rootNode]);
  const selectedNode = allNodes.find((node) => node.id === selectedNodeId) || rootNode;

  const filteredTreeNodes = useMemo(() => {
    const source = sidebarTab === "branches" ? [branchRoot] : [urlRoot];
    return filterNodes(source, treeSearch);
  }, [branchRoot, sidebarTab, treeSearch, urlRoot]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return usageRows;
    return usageRows.filter((row) => [row.domainName, row.device, row.date].join(" ").toLowerCase().includes(term));
  }, [usageRows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / URL_RULE_PAGE_SIZE));
  const pagedRows = filteredRows.slice((page - 1) * URL_RULE_PAGE_SIZE, page * URL_RULE_PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, selectedNodeId, fromDate, toDate]);

  useEffect(() => {
    if (!message && !error) return;
    const timer = window.setTimeout(() => {
      setMessage("");
      setError("");
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [message, error]);

  const loadTrees = async () => {
    setTreeLoading(true);
    setError("");
    try {
      const initial = await internetMeteringService.loadInitialData();
      setBranchNodes(normalizeDepartmentNodes(initial.departments));
      setUrlNodes(normalizeUrlNodes(initial.urlTree));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load internet metering tree.");
    } finally {
      setTreeLoading(false);
    }
  };

  const loadUsage = async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, unknown> = {
        fromDate,
        toDate,
        startDate: fromDate,
        endDate: toDate,
        urlID: selectedNode.urlMainIdn ?? -1,
        URLMain_Idn: selectedNode.urlMainIdn ?? -1,
        Object_Rel_Idn: selectedNode.objectRelIdn,
        Object_Root_Idn: selectedNode.objectRootIdn,
        Object_DeviceID: selectedNode.objectDeviceID,
      };
      const [usagePayload, statsPayload] = await Promise.all([
        internetMeteringService.getUsagePayload(params),
        internetMeteringService.getStatsPayload(params).catch(() => null),
      ]);
      const rows = normalizeUsageRows(usagePayload);
      setUsageRows(rows);
      setStats(normalizeStats(statsPayload, rows));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load internet usage data.");
      setUsageRows([]);
      setStats({ totalRecords: 0, totalDomains: 0, totalUsageSeconds: 0, totalCounts: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTrees();
  }, []);

  useEffect(() => {
    void loadUsage();
  }, [selectedNodeId, fromDate, toDate]);

  const runMeteringAction = async (action: MeteringAction) => {
    setMessage("");
    setError("");
    setActionLoading(action);
    try {
      await internetMeteringService.runMeteringAction(action, {
        ...buildActionPayload(selectedNode),
        Job_Command: getActionCommand(action),
        command: getActionCommand(action),
      });
      setMessage(`Internet metering ${action} request submitted.`);
      await loadUsage();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to ${action} internet metering.`);
    } finally {
      setActionLoading(null);
    }
  };

  const addUrl = async () => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    setMessage("");
    setError("");
    try {
      await internetMeteringService.createUrl({ URL: trimmed, DomainName: trimmed, Restrict: 0 });
      setNewUrl("");
      setMessage("URL rule created.");
      await loadTrees();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create URL rule.");
    }
  };

  const removeSelectedUrl = async () => {
    if (!selectedNode.urlMainIdn) return;
    setMessage("");
    setError("");
    try {
      await internetMeteringService.deleteUrl({ URLMain_Idn: selectedNode.urlMainIdn, urlID: selectedNode.urlMainIdn });
      setSelectedNodeId("all");
      setMessage("URL rule removed.");
      await loadTrees();
      await loadUsage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove URL rule.");
    }
  };

  const exportRows = () => {
    const headers = ["Domain", "URL ID", "Used Time", "Counts", "Device", "Date"];
    const csvRows = filteredRows.map((row) => [row.domainName, row.urlMainIdn, formatDuration(row.usedTime), row.counts, row.device, row.date]);
    const csv = [headers, ...csvRows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `internet-metering-${todayIso()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const renderNode = (node: TreeNodeType, depth = 0) => {
    const isSelected = selectedNodeId === node.id;
    const icon = node.type === "url" || node.type === "url-folder" ? <Link2 size={14} /> : node.type === "all" ? <Globe2 size={14} /> : <FolderTree size={14} />;

    return (
      <div key={node.id}>
        <EmaSidebarTreeRow active={isSelected} depth={depth} onClick={() => setSelectedNodeId(node.id)}>
          <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-white/70 text-slate-500">{icon}</span>
          <span className="min-w-0 flex-1 truncate">{node.label}</span>
          {typeof node.count === "number" ? <span className="rounded-full bg-white px-2 py-0.5 text-[0.68rem] font-black text-slate-500">{node.count}</span> : null}
        </EmaSidebarTreeRow>
        {node.children && node.children.length > 0 ? <div>{node.children.map((child) => renderNode(child, depth + 1))}</div> : null}
      </div>
    );
  };

  const usageColumns: EmaTableColumn<InternetUsageRow>[] = [
    {
      key: "no",
      header: "No",
      width: "5rem",
      render: (_row, index) => <span className="font-black text-slate-500">{String((page - 1) * URL_RULE_PAGE_SIZE + index + 1).padStart(2, "0")}</span>,
    },
    {
      key: "domain",
      header: "Domain",
      render: (row) => (
        <div className="min-w-0">
          <strong className="block break-words font-black text-slate-950">{row.domainName}</strong>
          <span className="text-xs font-bold text-slate-500">URL ID: {row.urlMainIdn}</span>
        </div>
      ),
    },
    {
      key: "duration",
      header: "Used Time",
      render: (row) => <span className="font-extrabold text-slate-800">{formatDuration(row.usedTime)}</span>,
    },
    {
      key: "counts",
      header: "Counts",
      align: "right",
      render: (row) => <span className="font-black text-slate-900">{formatNumber(row.counts)}</span>,
    },
    {
      key: "device",
      header: "Device",
      render: (row) => <span className="font-bold text-slate-700">{row.device}</span>,
    },
    {
      key: "date",
      header: "Date",
      render: (row) => <span className="text-xs font-bold text-slate-500">{row.date}</span>,
    },
  ];

  const toastItems = [
    ...(message ? [{ id: "internet-metering-message", tone: "success" as const, title: "Success", message }] : []),
    ...(error ? [{ id: "internet-metering-error", tone: "error" as const, title: "Error", message: error }] : []),
  ];

  const sidebar = (
    <EmaSidebarPanel
      eyebrow="Internet Metering"
      title="Internet Control"
      description="Browse branches, URL rules and internet usage records."
      tabs={[
        { id: "branches", label: "Branches", icon: <ListTree size={14} /> },
        { id: "urls", label: "URL Rules", icon: <Globe2 size={14} /> },
      ]}
      activeTab={sidebarTab}
      onTabChange={(tabId) => setSidebarTab(tabId === "urls" ? "urls" : "branches")}
      searchValue={treeSearch}
      searchPlaceholder={sidebarTab === "urls" ? "Search URL rule..." : "Search branch..."}
      onSearchChange={setTreeSearch}
      action={
        <EmaSidebarActionButton onClick={() => void loadTrees()} disabled={treeLoading}>
          <RefreshCw size={14} />
          {treeLoading ? "Loading..." : "Refresh Tree"}
        </EmaSidebarActionButton>
      }
    >
      {treeLoading ? <EmaSpinner label="Loading branches and URL rules..." /> : null}
      {!treeLoading && filteredTreeNodes.length === 0 ? (
        <div className="grid min-h-32 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs font-black uppercase tracking-[0.12em] text-slate-400">
          No item found.
        </div>
      ) : null}
      {!treeLoading ? <div>{filteredTreeNodes.map((node) => renderNode(node))}</div> : null}
    </EmaSidebarPanel>
  );

  return (
    <>
      <EmaToastViewport
        items={toastItems}
        onClose={(id) => {
          if (id === "internet-metering-message") setMessage("");
          if (id === "internet-metering-error") setError("");
        }}
      />

      <EmaPageLayout title="Internet Metering" subtitle="Monitor web usage, URL rules and collection status." sidebar={sidebar}>
        <div className="space-y-3">
          <EmaSection eyebrow="Internet Operations" title="Internet Metering" description="Monitor URL usage, collect usage records and maintain internet metering rules.">
            <EmaKpiGrid>
              <EmaKpiCard title="Total Records" value={formatNumber(stats.totalRecords)} note="usage rows" icon={<Database size={16} />} active={!loading} />
              <EmaKpiCard title="Domains" value={formatNumber(stats.totalDomains)} note="unique URLs" icon={<Globe2 size={16} />} tone="violet" />
              <EmaKpiCard title="Total Usage" value={formatDuration(stats.totalUsageSeconds)} note="recorded duration" icon={<Timer size={16} />} tone="emerald" />
              <EmaKpiCard title="Total Counts" value={formatNumber(stats.totalCounts)} note="hits / visits" icon={<MousePointerClick size={16} />} tone="amber" />
            </EmaKpiGrid>
          </EmaSection>

          <EmaToolbar
            left={
              <>
                <EmaButton variant="primary" onClick={() => void runMeteringAction("collect")} disabled={actionLoading !== null || loading}>
                  <Activity size={15} />
                  {actionLoading === "collect" ? "Collecting..." : "Collect"}
                </EmaButton>
              </>
            }
            search={<EmaSearchInput value={search} onChange={setSearch} placeholder="Search domain, device or date..." />}
            right={
              <>
                <EmaButton variant="secondary" onClick={() => void loadUsage()} disabled={loading}>
                  <RefreshCw size={15} />
                  Refresh
                </EmaButton>
                <EmaButton variant="primary" onClick={exportRows} disabled={filteredRows.length === 0 || loading}>
                  <Download size={15} />
                  Export
                </EmaButton>
              </>
            }
            filters={
              <>
                <EmaFilterField label="Start Date">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(event) => setFromDate(event.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-700 shadow-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </EmaFilterField>
                <EmaFilterField label="End Date">
                  <input
                    type="date"
                    value={toDate}
                    onChange={(event) => setToDate(event.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-700 shadow-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </EmaFilterField>
                <EmaButton
                  variant="ghost"
                  onClick={() => {
                    setSearch("");
                    setFromDate(daysAgoIso(7));
                    setToDate(todayIso());
                  }}
                >
                  Reset
                </EmaButton>
              </>
            }
          />

          <EmaTableShell title="URL Rule" subtitle={`Selected scope: ${selectedNode.label}`}>
            <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
              <EmaFilterField label="New URL / Domain">
                <input
                  value={newUrl}
                  onChange={(event) => setNewUrl(event.target.value)}
                  placeholder="example.com"
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-700 shadow-sm outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </EmaFilterField>
              <EmaButton variant="primary" onClick={() => void addUrl()} disabled={!newUrl.trim()}>
                <Plus size={15} />
                Add URL
              </EmaButton>
              <EmaButton variant="danger" onClick={() => void removeSelectedUrl()} disabled={!selectedNode.urlMainIdn}>
                <Trash2 size={15} />
                Remove Selected
              </EmaButton>
            </div>
          </EmaTableShell>

          <EmaTableShell title="Usage Records" subtitle={`${selectedNode.label} • ${filteredRows.length.toLocaleString()} records`}>
            {loading ? <EmaSpinner label="Loading internet usage..." /> : <EmaTable columns={usageColumns} rows={pagedRows} getRowKey={(row, index) => `${row.urlMainIdn}-${row.id}-${index}`} emptyText="No usage records found." />}
            <EmaPagination page={page} totalPages={totalPages} totalLabel={`Page ${page} of ${totalPages} • ${filteredRows.length.toLocaleString()} records`} onPageChange={setPage} />
          </EmaTableShell>
        </div>
      </EmaPageLayout>
    </>
  );
}
