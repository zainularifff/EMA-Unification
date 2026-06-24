const FALLBACK_MARKER = "__emaNetworkHierarchyFallbackInstalled";

type EmaWindowWithFallback = Window & typeof globalThis & {
  [FALLBACK_MARKER]?: boolean;
};

function createNetworkHierarchyFallbackResponse() {
  return new Response(
    JSON.stringify({
      success: true,
      message: "Fallback empty network hierarchy",
      data: {
        id: "organization",
        label: "All Network",
        type: "folder",
        counts: {
          registered: 0,
          notRegistered: 0,
          notInstalled: 0,
          otherDevice: 0,
        },
        children: [],
      },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

function createDepartmentTreeFallbackResponse(data: unknown[] = []) {
  return new Response(
    JSON.stringify({
      success: true,
      message: "Department tree loaded from department hierarchy",
      data,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

function getRequestUrl(input: RequestInfo | URL) {
  return typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
}

function getDepartmentHierarchyUrl(input: RequestInfo | URL) {
  const requestUrl = getRequestUrl(input);

  if (requestUrl.includes("/api/departments/tree")) {
    return requestUrl.replace("/api/departments/tree", "/api/departments");
  }

  return requestUrl;
}

function isNetworkHierarchyRequest(input: RequestInfo | URL) {
  return getRequestUrl(input).includes("/api/network/hierarchy");
}

function isDepartmentTreeRequest(input: RequestInfo | URL) {
  return getRequestUrl(input).includes("/api/departments/tree");
}

async function fetchDepartmentHierarchy(originalFetch: typeof window.fetch, input: RequestInfo | URL, init?: RequestInit) {
  try {
    const response = await originalFetch(getDepartmentHierarchyUrl(input), init);
    const clone = response.clone();
    const payload = await clone.json();

    if (!response.ok || payload?.success === false) {
      return createDepartmentTreeFallbackResponse();
    }

    if (Array.isArray(payload?.data)) {
      return createDepartmentTreeFallbackResponse(payload.data);
    }

    if (Array.isArray(payload)) {
      return createDepartmentTreeFallbackResponse(payload);
    }

    return createDepartmentTreeFallbackResponse();
  } catch {
    return createDepartmentTreeFallbackResponse();
  }
}

if (typeof window !== "undefined" && typeof window.fetch === "function") {
  const emaWindow = window as EmaWindowWithFallback;

  if (!emaWindow[FALLBACK_MARKER]) {
    emaWindow[FALLBACK_MARKER] = true;
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (isDepartmentTreeRequest(input)) {
        return fetchDepartmentHierarchy(originalFetch, input, init);
      }

      if (!isNetworkHierarchyRequest(input)) return originalFetch(input, init);

      try {
        const response = await originalFetch(input, init);
        const clone = response.clone();

        try {
          const payload = await clone.json();
          if (!response.ok || payload?.success === false || !payload?.data) {
            return createNetworkHierarchyFallbackResponse();
          }
        } catch {
          if (!response.ok) return createNetworkHierarchyFallbackResponse();
        }

        return response;
      } catch {
        return createNetworkHierarchyFallbackResponse();
      }
    };
  }
}

export {};
