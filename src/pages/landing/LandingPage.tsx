import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Database,
  Laptop,
  PackageCheck,
  Server,
  ShieldCheck,
  Users,
} from "lucide-react";

import {
  AppBadge,
  AppCard,
  EmptyState,
  PageHeader,
} from "../../components/common";

const metrics = [
  {
    label: "Total Hardware",
    value: "248",
    helper: "Registered assets",
    icon: Laptop,
    tone: "primary",
  },
  {
    label: "Active Users",
    value: "86",
    helper: "Workspace access",
    icon: Users,
    tone: "success",
  },
  {
    label: "Available Assets",
    value: "42",
    helper: "Ready for assignment",
    icon: PackageCheck,
    tone: "info",
  },
  {
    label: "Pending Action",
    value: "12",
    helper: "Need review",
    icon: AlertTriangle,
    tone: "warning",
  },
];

const quickActions = [
  {
    title: "Hardware Inventory",
    description: "Track devices, ownership, serial numbers and lifecycle status.",
    icon: Laptop,
    path: "/ema/hardware",
  },
  {
    title: "User Access",
    description: "Manage system users, roles and authorized workspace access.",
    icon: ShieldCheck,
    path: "/settings",
  },
  {
    title: "System Reports",
    description: "Review operational summaries, asset movement and audit data.",
    icon: BarChart3,
    path: "/reports",
  },
];

const activityItems = [
  {
    title: "Inventory sync completed",
    description: "Hardware records were refreshed successfully.",
    time: "Just now",
    icon: CheckCircle2,
  },
  {
    title: "New device pending assignment",
    description: "A laptop asset is waiting for ownership update.",
    time: "18 min ago",
    icon: Laptop,
  },
  {
    title: "Server health check",
    description: "API and database services are responding normally.",
    time: "1 hour ago",
    icon: Server,
  },
];

export default function LandingPage() {
  return (
    <>
      <PageHeader
        eyebrow="EMA Baru Workspace"
        title="Dashboard"
        description="A cleaner Bootstrap-based workspace for endpoint visibility, hardware inventory and system operations."
        actions={
          <>
            <Link
              to="/ema/hardware"
              className="btn btn-primary d-inline-flex align-items-center gap-2"
            >
              Open Hardware
              <ArrowRight size={18} />
            </Link>

            <button className="btn btn-light d-inline-flex align-items-center gap-2">
              <Database size={18} />
              System Status
            </button>
          </>
        }
      />

      <section className="dashboard-hero app-card border-0 mb-4">
        <div className="row g-4 align-items-center">
          <div className="col-12 col-xl-7">
            <AppBadge>Operations Console</AppBadge>

            <h2 className="dashboard-hero-title mt-3 mb-3">
              Manage endpoints, users and operational visibility from one place.
            </h2>

            <p className="dashboard-hero-text mb-4">
              Designed for daily system usage with better typography, clearer
              hierarchy and a simpler Bootstrap-first interface.
            </p>

            <div className="d-flex flex-wrap gap-2">
              <Link
                to="/ema/hardware"
                className="btn btn-primary d-inline-flex align-items-center gap-2"
              >
                Start Inventory Review
                <ArrowRight size={18} />
              </Link>

              <button className="btn btn-outline-secondary d-inline-flex align-items-center gap-2">
                <BarChart3 size={18} />
                View Reports
              </button>
            </div>
          </div>

          <div className="col-12 col-xl-5">
            <div className="dashboard-hero-panel">
              <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                  <div className="text-white-50 small">System Health</div>
                  <div className="h4 fw-bold text-white mb-0">Operational</div>
                </div>

                <div className="dashboard-hero-icon">
                  <Activity size={24} />
                </div>
              </div>

              <div className="dashboard-health-list">
                <div>
                  <span>API Service</span>
                  <strong>Online</strong>
                </div>

                <div>
                  <span>Database</span>
                  <strong>Stable</strong>
                </div>

                <div>
                  <span>Inventory Module</span>
                  <strong>Ready</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="row g-3 mb-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div className="col-12 col-md-6 col-xl-3" key={metric.label}>
              <AppCard className="h-100 dashboard-metric-card">
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <div>
                    <div className="text-muted small mb-2">{metric.label}</div>
                    <div className="dashboard-metric-value">{metric.value}</div>
                    <div className="text-muted small mt-1">{metric.helper}</div>
                  </div>

                  <div
                    className={`dashboard-metric-icon dashboard-metric-${metric.tone}`}
                  >
                    <Icon size={22} />
                  </div>
                </div>
              </AppCard>
            </div>
          );
        })}
      </section>

      <section className="row g-4">
        <div className="col-12 col-xl-8">
          <AppCard className="h-100" bodyClassName="p-4">
            <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
              <div>
                <h2 className="h5 fw-bold mb-1">Quick Actions</h2>
                <p className="text-muted mb-0">
                  Start with the most common EMA workflows.
                </p>
              </div>
            </div>

            <div className="row g-3">
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <div className="col-12 col-md-6 col-xxl-4" key={action.title}>
                    <Link
                      to={action.path}
                      className="dashboard-action-card text-decoration-none"
                    >
                      <div className="app-icon-box mb-3">
                        <Icon size={22} />
                      </div>

                      <h3 className="h6 fw-bold mb-2">{action.title}</h3>

                      <p className="text-muted small mb-3">
                        {action.description}
                      </p>

                      <span className="dashboard-action-link">
                        Open module
                        <ArrowRight size={16} />
                      </span>
                    </Link>
                  </div>
                );
              })}
            </div>
          </AppCard>
        </div>

        <div className="col-12 col-xl-4">
          <AppCard className="h-100" bodyClassName="p-4">
            <div className="d-flex align-items-center justify-content-between mb-4">
              <div>
                <h2 className="h5 fw-bold mb-1">Recent Activity</h2>
                <p className="text-muted mb-0 small">Latest system updates</p>
              </div>
            </div>

            {activityItems.length > 0 ? (
              <div className="dashboard-activity-list">
                {activityItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div className="dashboard-activity-item" key={item.title}>
                      <div className="app-icon-box app-icon-box-sm">
                        <Icon size={17} />
                      </div>

                      <div className="min-w-0">
                        <div className="fw-bold">{item.title}</div>
                        <div className="text-muted small">
                          {item.description}
                        </div>
                        <div className="dashboard-activity-time">
                          {item.time}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="No activity yet"
                description="System activity will appear here once modules are connected."
              />
            )}
          </AppCard>
        </div>
      </section>
    </>
  );
}