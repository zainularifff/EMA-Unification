export function notificationNonBlockingTransform() {
  return {
    name: 'notification-non-blocking-ui-transform',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.replace(/\\/g, '/').endsWith('/src/components/settings/NotificationChannelsSettings.tsx')) return null;

      let next = code;

      const blockingLoader = `        {message && <div className={\`notification-alert \${message.tone}\`}>{message.text}</div>}\n        {loading ? (\n          <div className="notification-panel notification-status-card"><Loader2 className="spin" /> Loading notification settings...</div>\n        ) : activeTab === "email" ? (`;

      const nonBlockingLoader = `        {message && <div className={\`notification-alert \${message.tone}\`}>{message.text}</div>}\n        {loading && !message ? <div className="notification-alert info"><Loader2 className="spin" size={15} /> Syncing notification settings in background...</div> : null}\n        {activeTab === "email" ? (`;

      if (next.includes(blockingLoader)) {
        next = next.replace(blockingLoader, nonBlockingLoader);
      }

      const refreshButton = `<button className="notification-btn" onClick={() => load()} disabled={loading}><RefreshCw size={15} /> Refresh</button>`;
      const refreshButtonNonBlocking = `<button className="notification-btn" onClick={() => load()} disabled={loading}>{loading ? <Loader2 className="spin" size={15} /> : <RefreshCw size={15} />} {loading ? "Syncing" : "Refresh"}</button>`;
      if (next.includes(refreshButton)) {
        next = next.replace(refreshButton, refreshButtonNonBlocking);
      }

      return next === code ? null : { code: next, map: null };
    },
  };
}
