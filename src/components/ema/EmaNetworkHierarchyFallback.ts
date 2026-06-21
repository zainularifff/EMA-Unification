const FALLBACK_MARKER = "__emaNetworkHierarchyFallbackInstalled";

type EmaWindowWithFallback = Window & typeof globalThis & {
  [FALLBACK_MARKER]?: boolean;
};

function createFallbackResponse() {
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

function isHierarchyRequest(input: RequestInfo | URL) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  return url.includes("/api/network/hierarchy");
}

if (typeof window !== "undefined" && typeof window.fetch === "function") {
  const emaWindow = window as EmaWindowWithFallback;

  if (!emaWindow[FALLBACK_MARKER]) {
    emaWindow[FALLBACK_MARKER] = true;
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!isHierarchyRequest(input)) return originalFetch(input, init);

      try {
        const response = await originalFetch(input, init);
        const clone = response.clone();

        try {
          const payload = await clone.json();
          if (!response.ok || payload?.success === false || !payload?.data) {
            return createFallbackResponse();
          }
        } catch {
          if (!response.ok) return createFallbackResponse();
        }

        return response;
      } catch {
        return createFallbackResponse();
      }
    };
  }
}

export {};
