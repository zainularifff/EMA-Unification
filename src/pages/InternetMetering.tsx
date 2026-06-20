import { useEffect, useMemo, useState } from 'react';
import internetMeteringService from '../services/internetMeteringService';
type NodeKind = 'all' | 'folder' | 'device' | 'url-folder' | 'url';
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
type MeteringAction = 'start' | 'collect' | 'stop';
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
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
function extractArray<T>(payload: unknown): T[] {
    if (Array.isArray(payload))
        return payload as T[];
    const record = asRecord(payload);
    if (Array.isArray(record.data))
        return record.data as T[];
    const nestedData = asRecord(record.data);
    if (Array.isArray(nestedData.data))
        return nestedData.data as T[];
    if (Array.isArray(record.result))
        return record.result as T[];
    if (Array.isArray(record.results))
        return record.results as T[];
    if (Array.isArray(record.recordset))
        return record.recordset as T[];
    if (Array.isArray(record.rows))
        return record.rows as T[];
    return [];
}
function textFrom(row: unknown, keys: string[], fallback = '') {
    const record = asRecord(row);
    const keyMap = new Map(Object.keys(record).map((key) => [key.toLowerCase(), key]));
    for (const key of keys) {
        const actualKey = keyMap.get(key.toLowerCase()) || key;
        const value = record[actualKey];
        if (value !== undefined && value !== null && String(value).trim() !== '')
            return String(value).trim();
    }
    return fallback;
}
function numberFrom(row: unknown, keys: string[], fallback = 0) {
    const value = textFrom(row, keys, '');
    if (!value)
        return fallback;
    const parsed = Number.parseInt(value.replace(/,/g, ''), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function formatNumber(value: number) {
    return new Intl.NumberFormat('en-MY').format(Number(value) || 0);
}
function formatDuration(seconds: number) {
    const safeSeconds = Math.max(Number(seconds) || 0, 0);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const secs = safeSeconds % 60;
    if (hours > 0)
        return `${hours}h ${minutes}m`;
    if (minutes > 0)
        return `${minutes}m ${secs}s`;
    return `${secs}s`;
}
function normalizeDate(value: unknown) {
    const raw = String(value || '').trim();
    if (!raw)
        return '-';
    const date = new Date(raw);
    if (Number.isNaN(date.getTime()))
        return raw;
    return date.toLocaleString('en-MY', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}
function normalizeUsageRows(payload: unknown): InternetUsageRow[] {
    const rows = extractArray<Record<string, unknown>>(payload);
    return rows.map((row, index) => {
        const urlMainIdn = numberFrom(row, ['URLMain_Idn', 'UrlMain_Idn', 'urlMainIdn', 'URLID', 'urlID', 'id'], index + 1);
        return {
            id: numberFrom(row, ['id', 'RowNo', 'No'], index + 1),
            domainName: textFrom(row, ['DomainName', 'Domain', 'URL', 'Url', 'Site', 'WebSite', 'Name'], '-'),
            urlMainIdn,
            usedTime: numberFrom(row, ['UsedTime', 'UseTime', 'Duration', 'Seconds', 'TotalSeconds'], 0),
            counts: numberFrom(row, ['Counts', 'Count', 'Hits', 'TotalCount'], 0),
            device: textFrom(row, ['ComputerName', 'DeviceName', 'ClientName', 'Username', 'UserName'], '-'),
            date: normalizeDate(textFrom(row, ['Date', 'UsedDate', 'CreatedTime', 'UpdateTime', 'LastUpdate'], '')),
            raw: row,
        };
    });
}
function normalizeStats(payload: unknown, fallbackRows: InternetUsageRow[]): InternetStats {
    const record = asRecord(payload);
    const rows = extractArray<Record<string, unknown>>(payload);
    const source = rows[0] || record;
    const totalRecords = numberFrom(source, ['totalRecords', 'TotalRecords', 'Total', 'Count'], fallbackRows.length);
    const totalDomains = numberFrom(source, ['totalDomains', 'TotalDomains', 'DomainCount'], new Set(fallbackRows.map((row) => row.domainName)).size);
    const totalUsageSeconds = numberFrom(source, ['totalUsageSeconds', 'TotalUsageSeconds', 'UsedTime', 'Duration'], fallbackRows.reduce((sum, row) => sum + row.usedTime, 0));
    const totalCounts = numberFrom(source, ['totalCounts', 'TotalCounts', 'Counts', 'Hits'], fallbackRows.reduce((sum, row) => sum + row.counts, 0));
    return {
        totalRecords,
        totalDomains,
        totalUsageSeconds,
        totalCounts,
    };
}
function normalizeDepartmentNodes(payload: unknown): TreeNodeType[] {
    const rows = extractArray<Record<string, unknown>>(payload);
    return rows.map((row, index) => {
        const relationId = numberFrom(row, ['Object_Rel_Idn', 'objectRelIdn', 'RelationID', 'id'], index + 1);
        const label = textFrom(row, ['Object_Rel_Name', 'Object_Full_Name', 'label', 'name'], `Branch ${relationId}`);
        return {
            id: `branch-${relationId}`,
            label,
            type: 'folder',
            objectRelIdn: relationId,
            count: numberFrom(row, ['TotalDevices', 'DeviceCount', 'count'], 0),
            raw: row,
        };
    });
}
function normalizeUrlNodes(payload: unknown): TreeNodeType[] {
    const rows = extractArray<Record<string, unknown>>(payload);
    return rows.map((row, index) => {
        const urlMainIdn = numberFrom(row, ['URLMain_Idn', 'UrlMain_Idn', 'urlMainIdn', 'URLID', 'urlID', 'id'], index + 1);
        const label = textFrom(row, ['DomainName', 'Domain', 'URL', 'Url', 'Name', 'label'], `URL ${urlMainIdn}`);
        const restrict = numberFrom(row, ['Restrict', 'restrict', 'IsRestricted', 'Blocked'], 0);
        return {
            id: `url-${urlMainIdn}`,
            label,
            type: 'url',
            urlMainIdn,
            url: textFrom(row, ['URL', 'Url', 'DomainName', 'Domain'], label),
            restrict,
            count: numberFrom(row, ['Count', 'TotalCount', 'Hits'], 0),
            raw: row,
        };
    });
}
function flattenNodes(nodes: TreeNodeType[]): TreeNodeType[] {
    return nodes.flatMap((node) => [node, ...(node.children ? flattenNodes(node.children) : [])]);
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
    if (action === 'start')
        return WEB_METERING_START_COMMAND;
    if (action === 'stop')
        return WEB_METERING_STOP_COMMAND;
    return WEB_METERING_COLLECT_COMMAND;
}
export default function InternetMetering() {
    const [branchNodes, setBranchNodes] = useState<TreeNodeType[]>([]);
    const [urlNodes, setUrlNodes] = useState<TreeNodeType[]>([]);
    const [selectedNodeId, setSelectedNodeId] = useState('all');
    const [usageRows, setUsageRows] = useState<InternetUsageRow[]>([]);
    const [stats, setStats] = useState<InternetStats>({ totalRecords: 0, totalDomains: 0, totalUsageSeconds: 0, totalCounts: 0 });
    const [search, setSearch] = useState('');
    const [fromDate, setFromDate] = useState(daysAgoIso(7));
    const [toDate, setToDate] = useState(todayIso());
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [treeLoading, setTreeLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [newUrl, setNewUrl] = useState('');
    const rootNode: TreeNodeType = useMemo(() => ({
        id: 'all',
        label: 'All Internet Metering',
        type: 'all',
        children: [
            { id: 'branches', label: 'Branches', type: 'folder', children: branchNodes },
            { id: 'urls', label: 'URL Rules', type: 'url-folder', children: urlNodes },
        ],
    }), [branchNodes, urlNodes]);
    const allNodes = useMemo(() => flattenNodes([rootNode]), [rootNode]);
    const selectedNode = allNodes.find((node) => node.id === selectedNodeId) || rootNode;
    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term)
            return usageRows;
        return usageRows.filter((row) => [row.domainName, row.device, row.date].join(' ').toLowerCase().includes(term));
    }, [usageRows, search]);
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / URL_RULE_PAGE_SIZE));
    const pagedRows = filteredRows.slice((page - 1) * URL_RULE_PAGE_SIZE, page * URL_RULE_PAGE_SIZE);
    useEffect(() => {
        setPage(1);
    }, [search, selectedNodeId, fromDate, toDate]);
    const loadTrees = async () => {
        setTreeLoading(true);
        setError('');
        try {
            const initial = await internetMeteringService.loadInitialData();
            setBranchNodes(normalizeDepartmentNodes(initial.departments));
            setUrlNodes(normalizeUrlNodes(initial.urlTree));
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to load internet metering tree.');
        }
        finally {
            setTreeLoading(false);
        }
    };
    const loadUsage = async () => {
        setLoading(true);
        setError('');
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
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to load internet usage data.');
            setUsageRows([]);
            setStats({ totalRecords: 0, totalDomains: 0, totalUsageSeconds: 0, totalCounts: 0 });
        }
        finally {
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
        setMessage('');
        setError('');
        try {
            await internetMeteringService.runMeteringAction(action, {
                ...buildActionPayload(selectedNode),
                Job_Command: getActionCommand(action),
                command: getActionCommand(action),
            });
            setMessage(`Internet metering ${action} request submitted.`);
            await loadUsage();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : `Unable to ${action} internet metering.`);
        }
    };
    const addUrl = async () => {
        const trimmed = newUrl.trim();
        if (!trimmed)
            return;
        setMessage('');
        setError('');
        try {
            await internetMeteringService.createUrl({ URL: trimmed, DomainName: trimmed, Restrict: 0 });
            setNewUrl('');
            setMessage('URL rule created.');
            await loadTrees();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to create URL rule.');
        }
    };
    const removeSelectedUrl = async () => {
        if (!selectedNode.urlMainIdn)
            return;
        setMessage('');
        setError('');
        try {
            await internetMeteringService.deleteUrl({ URLMain_Idn: selectedNode.urlMainIdn, urlID: selectedNode.urlMainIdn });
            setSelectedNodeId('all');
            setMessage('URL rule removed.');
            await loadTrees();
            await loadUsage();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to remove URL rule.');
        }
    };
    const exportRows = () => {
        const headers = ['Domain', 'URL ID', 'Used Time', 'Counts', 'Device', 'Date'];
        const csvRows = filteredRows.map((row) => [row.domainName, row.urlMainIdn, formatDuration(row.usedTime), row.counts, row.device, row.date]);
        const csv = [headers, ...csvRows]
            .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `internet-metering-${todayIso()}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
    };
    const renderNode = (node: TreeNodeType, depth = 0) => {
        const isSelected = selectedNodeId === node.id;
        return (<li key={node.id}>
        <button type="button" aria-pressed={isSelected} onClick={() => setSelectedNodeId(node.id)}>
          {depth > 0 ? '— '.repeat(depth) : ''}
          {node.label}
          {typeof node.count === 'number' ? ` (${node.count})` : ''}
        </button>
        {node.children && node.children.length > 0 && <ul>{node.children.map((child) => renderNode(child, depth + 1))}</ul>}
      </li>);
    };
    return (<main>
      <aside>
        <h1>Internet Metering</h1>
        <p>Browse branches, URL rules and internet usage records.</p>
        <button type="button" onClick={() => void loadTrees()} disabled={treeLoading}>
          {treeLoading ? 'Loading...' : 'Refresh Tree'}
        </button>
        <nav>
          <ul>{renderNode(rootNode)}</ul>
        </nav>
      </aside>

      <section>
        <header>
          <p>Selected Scope</p>
          <h2>{selectedNode.label}</h2>
          <p>{selectedNode.type}</p>
        </header>

        {message && <p>{message}</p>}
        {error && <p>{error}</p>}

        <section>
          <article>
            <span>Total Records</span>
            <strong>{formatNumber(stats.totalRecords)}</strong>
          </article>
          <article>
            <span>Total Domains</span>
            <strong>{formatNumber(stats.totalDomains)}</strong>
          </article>
          <article>
            <span>Total Usage</span>
            <strong>{formatDuration(stats.totalUsageSeconds)}</strong>
          </article>
          <article>
            <span>Total Counts</span>
            <strong>{formatNumber(stats.totalCounts)}</strong>
          </article>
        </section>

        <section>
          <button type="button" onClick={() => void runMeteringAction('collect')}>
            Collect
          </button>
          <button type="button" onClick={() => void runMeteringAction('start')}>
            Start
          </button>
          <button type="button" onClick={() => void runMeteringAction('stop')}>
            Stop
          </button>
          <button type="button" onClick={() => void loadUsage()}>
            Refresh
          </button>
          <button type="button" onClick={exportRows} disabled={filteredRows.length === 0}>
            Export
          </button>
        </section>

        <section>
          <label>
            Search
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search internet usage"/>
          </label>
          <label>
            From
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)}/>
          </label>
          <label>
            To
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)}/>
          </label>
        </section>

        <section>
          <h3>URL Rule</h3>
          <input value={newUrl} onChange={(event) => setNewUrl(event.target.value)} placeholder="example.com"/>
          <button type="button" onClick={() => void addUrl()} disabled={!newUrl.trim()}>
            Add URL
          </button>
          <button type="button" onClick={() => void removeSelectedUrl()} disabled={!selectedNode.urlMainIdn}>
            Remove Selected URL
          </button>
        </section>

        <section>
          <h3>Usage Records</h3>
          {loading ? (<p>Loading data...</p>) : (<table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Domain</th>
                  <th>URL ID</th>
                  <th>Used Time</th>
                  <th>Counts</th>
                  <th>Device</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.length === 0 ? (<tr>
                    <td colSpan={7}>No usage records found.</td>
                  </tr>) : (pagedRows.map((row, index) => (<tr key={`${row.urlMainIdn}-${row.id}-${index}`}>
                      <td>{(page - 1) * URL_RULE_PAGE_SIZE + index + 1}</td>
                      <td>{row.domainName}</td>
                      <td>{row.urlMainIdn}</td>
                      <td>{formatDuration(row.usedTime)}</td>
                      <td>{formatNumber(row.counts)}</td>
                      <td>{row.device}</td>
                      <td>{row.date}</td>
                    </tr>)))}
              </tbody>
            </table>)}
        </section>

        <footer>
          <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>
            Next
          </button>
        </footer>
      </section>
    </main>);
}
