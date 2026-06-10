# Migration Plan

## Phase 1 — Safe Introduction

Add new service files only:

```txt
src/services/apiClient.ts
src/services/moduleApiRegistry.ts
src/services/moduleDataService.ts
src/services/index.ts
src/hooks/useModuleData.ts
```

Do not change existing pages yet.

Run:

```bash
npm install
npm run dev
```

If TypeScript passes, move to Phase 2.

## Phase 2 — Convert SoftwareInventory

Replace direct API calls with:

```ts
useModuleData("softwareInventory")
```

Recommended because software page currently loads data, categories, search and table logic inside one component.

## Phase 3 — Convert HardwareInventory

Use:

```ts
useModuleData("hardwareInventory")
```

For department + summary.

For per-device details, use:

```ts
loadSingleModuleApi("endpointDetails", "deviceDetails", {
  params: {
    objectAgent: device.objectAgent,
    assetId: device.assetId,
  },
});
```

## Phase 4 — Backend Optimization

Add backend aggregate endpoints:

```txt
GET /api/hardware/inventory
GET /api/software?page=&pageSize=&search=&category=&sort=&direction=
```

Then update only `moduleApiRegistry.ts`, not all UI pages.
