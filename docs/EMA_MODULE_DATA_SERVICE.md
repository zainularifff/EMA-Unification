# EMA Module Data Service

Purpose: make frontend pages stop calling API directly from every component.

This introduces a middleman layer:

```txt
UI Page
  ↓
useModuleData()
  ↓
moduleDataService
  ↓
moduleApiRegistry
  ↓
apiClient
  ↓
Backend API
```

## Files

Copy these files into your project:

```txt
src/services/apiClient.ts
src/services/moduleApiRegistry.ts
src/services/moduleDataService.ts
src/services/index.ts
src/hooks/useModuleData.ts
```

## Environment

Add or confirm this in `.env`:

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_API_TIMEOUT_MS=20000
```

## How to use in SoftwareInventory

Instead of calling:

```ts
apiGet("/api/software")
apiGet("/api/software/categories")
```

use:

```ts
import { useModuleData } from "../../../hooks/useModuleData";

const { data, loading, error, reload } = useModuleData<{
  software: ApiSoftwareRecord[];
  categories: string[];
}>("softwareInventory");

const softwareRecords = data?.software || [];
const categories = data?.categories || [];
```

## How to use in HardwareInventory

```ts
import { useModuleData } from "../../../hooks/useModuleData";

const { data, loading, error, reload } = useModuleData<{
  departments: ApiDepartment[];
  hardwareSummary?: unknown;
}>("hardwareInventory");

const departments = data?.departments || [];
```

## Why this helps

- UI no longer decides which APIs to call.
- API calls are centralized by module.
- Cache prevents repeated calls.
- Duplicate API requests are deduplicated.
- Required API failure can stop the module load.
- Optional API failure does not break the whole page.
- Later, role-based module access can be added inside the service layer.

## Important note

This improves frontend API management, but for very large data you should still add backend pagination:

```txt
GET /api/software?page=1&pageSize=25&search=chrome&sort=softwareName&direction=asc
```

For hardware inventory, best backend improvement:

```txt
GET /api/hardware/inventory
```

instead of frontend calling:

```txt
GET /api/assets/{relationID}
```

many times.
