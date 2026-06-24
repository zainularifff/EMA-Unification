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

function createDepartmentTreeFallbackResponse() {
  return new Response(
    JSON.stringify({
      success: true,
      message: "Fallback empty department tree",
      data: [],
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

function isNetworkHierarchyRequest(input: RequestInfo | URL) {
  return getRequestUrl(input).includes("/api/network/hierarchy");
}

function isDepartmentTreeRequest(input: RequestInfo | URL) {
  return getRequestUrl(input).includes("/api/departments/tree");
}

if (typeof window !== "undefined" && typeof window.fetch === "function") {
  const emaWindow = window as EmaWindowWithFallback;

  if (!emaWindow[FALLBACK_MARKER]) {
    emaWindow[FALLBACK_MARKER] = true;
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (isDepartmentTreeRequest(input)) {
        return createDepartmentTreeFallbackResponse();
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