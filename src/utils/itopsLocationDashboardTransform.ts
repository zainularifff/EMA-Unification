export function itopsLocationDashboardTransform() {
  return {
    name: 'itops-location-dashboard-transform',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.replace(/\\/g, '/').endsWith('/src/pages/Dashboard.tsx')) return null;

      let next = code;

      const apiPathMarker = "const ITOPS_DASHBOARD_API_PATH = '/api/dashboard/it-operations';";
      if (next.includes(apiPathMarker) && !next.includes('ITOPS_LOCATION_OVERVIEW_API_PATH')) {
        next = next.replace(
          apiPathMarker,
          `${apiPathMarker}\nconst ITOPS_LOCATION_OVERVIEW_API_PATH = '/api/it-operations/location/overview';`
        );
      }

      const helperMarker = '\n\nfunction exportJsonFile';
      if (next.includes(helperMarker) && !next.includes('type ItOpsLocationPatch =')) {
        next = next.replace(helperMarker, `

type ItOpsLocationPatch = {
  geolocation: GeoSummary;
  missingGeoDevices: number;
  staleGeoDevices: number;
  unknownGeoDevices: number;
};

function readFirstNumber(record: Record<string, unknown>, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = firstRawValue(record, [key]);
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return fallback;
}

function getObjectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalizeLocationBreakdownRows(value: unknown): BreakdownItem[] {
  if (!Array.isArray(value)) return [];

  return value.map((row) => {
    const record = getObjectRecord(row);
    const valueNumber = readFirstNumber(record, ['value', 'count', 'total', 'devices', 'deviceCount'], 0);
    const percentValue = firstRawValue(record, ['percent', 'percentage']);
    const percent = percentValue === undefined || percentValue === null || String(percentValue).trim() === ''
      ? undefined
      : numberOrFallback(percentValue);

    return {
      name: firstTextValue(record, ['name', 'locationName', 'LocationName', 'location', 'Location', 'branch', 'Branch'], 'Unknown Location'),
      value: valueNumber,
      percent,
      tone: firstTextValue(record, ['tone', 'Tone']),
    } as BreakdownItem;
  }).filter((row) => row.name && row.value > 0);
}

function pickLocationOverviewRecord(raw: unknown): Record<string, unknown> {
  const root = getObjectRecord(raw);
  const data = getObjectRecord(root.data) || root;
  return getObjectRecord(data.geolocation)
    || getObjectRecord(data.location)
    || getObjectRecord(data.summary)
    || data;
}

function normalizeItOpsLocationPatch(raw: unknown): ItOpsLocationPatch | null {
  const record = pickLocationOverviewRecord(raw);
  if (!Object.keys(record).length) return null;

  const trackedRows = normalizeGeoDeviceRows(readArrayFromRecord(record, ['trackedRows', 'withLocationRows', 'detectedRows', 'mappedRows']), 'With Location');
  const locationRows = normalizeGeoDeviceRows(readArrayFromRecord(record, ['locationRows', 'rows', 'devices']), 'With Location');
  const staleRows = normalizeGeoDeviceRows(readArrayFromRecord(record, ['staleRows', 'staleLocationRows', 'oldLocationRows']), 'Old Data');
  const unknownRows = normalizeGeoDeviceRows(readArrayFromRecord(record, ['unknownRows', 'unknownLocationRows']), 'Unknown');
  const missingGeoRows = normalizeGeoDeviceRows(readArrayFromRecord(record, ['missingGeoRows', 'notMappedRows', 'missingRows', 'noLocationRows']), 'Not Mapped');
  const topLocations = normalizeLocationBreakdownRows(
    firstRawValue(record, ['topLocations', 'locationBreakdown', 'locations', 'breakdown', 'distribution'])
  );

  const mergedTrackedRows = trackedRows.length ? trackedRows : locationRows;
  const trackedDevices = readFirstNumber(record, ['trackedDevices', 'withLocation', 'withLocationDevices', 'detectedDevices', 'detected', 'mappedDevices'], mergedTrackedRows.length);
  const missingGeoDevices = readFirstNumber(record, ['missingGeoDevices', 'notMapped', 'notMappedDevices', 'missingDevices', 'noLocationDevices'], missingGeoRows.length);
  const staleLocations = readFirstNumber(record, ['staleLocations', 'staleDevices', 'oldLocationDevices'], staleRows.length);
  const unknownLocations = readFirstNumber(record, ['unknownLocations', 'unknownDevices'], unknownRows.length);
  const latestLocationTimeRaw = firstRawValue(record, ['latestLocationTime', 'latestTime', 'lastUpdated', 'updatedAt', 'generatedAt']);

  return {
    geolocation: {
      ...EMPTY_GEO_SUMMARY,
      trackedDevices,
      staleLocations,
      unknownLocations,
      latestLocationTime: latestLocationTimeRaw ? formatDateLabel(latestLocationTimeRaw) : firstTextValue(record, ['latestLocationTimeLabel', 'latestLocationTime'], '-'),
      topLocations,
      locationRows: locationRows.length ? locationRows : mergedTrackedRows,
      trackedRows: mergedTrackedRows,
      staleRows,
      unknownRows,
      missingGeoRows,
    },
    missingGeoDevices,
    staleGeoDevices: staleLocations,
    unknownGeoDevices: unknownLocations,
  };
}

async function fetchItOpsLocationPatch(forceRefresh = false): Promise<ItOpsLocationPatch | null> {
  const token = getStoredAccessToken();
  const headers = new Headers({ Accept: 'application/json' });
  if (token) headers.set('Authorization', 'Bearer ' + token);

  const locationUrl = buildApiUrl(ITOPS_LOCATION_OVERVIEW_API_PATH, { refresh: forceRefresh ? 1 : undefined });
  const response = await fetch(locationUrl, {
    headers,
    credentials: 'include',
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.message || 'Location data failed: ' + response.status + ' (' + locationUrl + ')');
  }

  return normalizeItOpsLocationPatch(payload?.data ?? payload);
}

function applyItOpsLocationPatch(data: ItOpsDashboardData, patch: ItOpsLocationPatch | null): ItOpsDashboardData {
  if (!patch) return data;

  const geolocationRiskItems = Math.max(
    0,
    patch.missingGeoDevices + patch.staleGeoDevices + patch.unknownGeoDevices
  );

  return {
    ...data,
    geolocation: patch.geolocation,
    risk: {
      ...data.risk,
      missingGeoDevices: patch.missingGeoDevices,
      staleGeoDevices: patch.staleGeoDevices,
      unknownGeoDevices: patch.unknownGeoDevices,
      geolocationRiskItems,
    },
  };
}

function exportJsonFile`);
      }

      const loadMarker = `      const data = await fetchItOpsDashboardData(forceRefresh);\n      setDashboardData(data);`;
      if (next.includes(loadMarker) && !next.includes('const [data, locationPatch] = await Promise.all')) {
        next = next.replace(
          loadMarker,
          `      const [data, locationPatch] = await Promise.all([\n        fetchItOpsDashboardData(forceRefresh),\n        fetchItOpsLocationPatch(forceRefresh).catch((locationError) => {\n          console.warn('IT Operations location API skipped:', locationError);\n          return null;\n        }),\n      ]);\n      setDashboardData(applyItOpsLocationPatch(data, locationPatch));`
        );
      }

      return next === code ? null : { code: next, map: null };
    },
  };
}
