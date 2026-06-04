import { useMemo, useState } from "react";
import {
  Download,
  Eye,
  Filter,
  Laptop,
  Monitor,
  PackageCheck,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import {
  AppBadge,
  AppButton,
  AppCard,
  AppInput,
  AppSelect,
  AppTable,
  EmptyState,
  PageHeader,
} from "../../../components/common";

type HardwareStatus = "In Use" | "Available" | "Maintenance" | "Retired";

type HardwareItem = {
  id: number;
  assetTag: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  serialNo: string;
  owner: string;
  location: string;
  status: HardwareStatus;
  lastUpdated: string;
};

const hardwareItems: HardwareItem[] = [
  {
    id: 1,
    assetTag: "EMA-HW-0001",
    name: "Dell Latitude 5440",
    category: "Laptop",
    brand: "Dell",
    model: "Latitude 5440",
    serialNo: "DL5440-WT-001",
    owner: "Zainul Ariffin",
    location: "HQ Office",
    status: "In Use",
    lastUpdated: "Today",
  },
  {
    id: 2,
    assetTag: "EMA-HW-0002",
    name: "HP EliteDesk 800",
    category: "Desktop",
    brand: "HP",
    model: "EliteDesk 800",
    serialNo: "HP800-WT-014",
    owner: "Unassigned",
    location: "Store Room",
    status: "Available",
    lastUpdated: "Yesterday",
  },
  {
    id: 3,
    assetTag: "EMA-HW-0003",
    name: "Lenovo ThinkPad T14",
    category: "Laptop",
    brand: "Lenovo",
    model: "ThinkPad T14",
    serialNo: "LNV-T14-083",
    owner: "Operations Team",
    location: "Client Site",
    status: "Maintenance",
    lastUpdated: "2 days ago",
  },
  {
    id: 4,
    assetTag: "EMA-HW-0004",
    name: "Acer Veriton",
    category: "Desktop",
    brand: "Acer",
    model: "Veriton",
    serialNo: "ACR-VTN-332",
    owner: "Finance Department",
    location: "Finance Room",
    status: "Retired",
    lastUpdated: "Last week",
  },
];

const statusOptions = [
  { label: "All Status", value: "all" },
  { label: "In Use", value: "In Use" },
  { label: "Available", value: "Available" },
  { label: "Maintenance", value: "Maintenance" },
  { label: "Retired", value: "Retired" },
];

const categoryOptions = [
  { label: "All Categories", value: "all" },
  { label: "Laptop", value: "Laptop" },
  { label: "Desktop", value: "Desktop" },
  { label: "Printer", value: "Printer" },
  { label: "Network", value: "Network" },
];

function getStatusTone(status: HardwareStatus) {
  switch (status) {
    case "In Use":
      return "success";
    case "Available":
      return "info";
    case "Maintenance":
      return "warning";
    case "Retired":
      return "secondary";
    default:
      return "primary";
  }
}

function getHardwareIcon(category: string) {
  if (category === "Desktop") return Monitor;
  if (category === "Laptop") return Laptop;
  return Settings;
}

export default function HardwareInventory() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");

  const filteredItems = useMemo(() => {
    return hardwareItems.filter((item) => {
      const keyword = search.toLowerCase();

      const matchesSearch =
        item.assetTag.toLowerCase().includes(keyword) ||
        item.name.toLowerCase().includes(keyword) ||
        item.serialNo.toLowerCase().includes(keyword) ||
        item.owner.toLowerCase().includes(keyword) ||
        item.location.toLowerCase().includes(keyword);

      const matchesStatus = status === "all" || item.status === status;
      const matchesCategory = category === "all" || item.category === category;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [search, status, category]);

  const totalAssets = hardwareItems.length;
  const inUseAssets = hardwareItems.filter((item) => item.status === "In Use").length;
  const availableAssets = hardwareItems.filter(
    (item) => item.status === "Available"
  ).length;
  const maintenanceAssets = hardwareItems.filter(
    (item) => item.status === "Maintenance"
  ).length;

  const metrics = [
    {
      label: "Total Assets",
      value: totalAssets,
      helper: "Registered hardware",
      icon: Laptop,
      tone: "primary",
    },
    {
      label: "In Use",
      value: inUseAssets,
      helper: "Assigned devices",
      icon: ShieldCheck,
      tone: "success",
    },
    {
      label: "Available",
      value: availableAssets,
      helper: "Ready to assign",
      icon: PackageCheck,
      tone: "info",
    },
    {
      label: "Maintenance",
      value: maintenanceAssets,
      helper: "Needs attention",
      icon: Wrench,
      tone: "warning",
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="EMA Hardware"
        title="Hardware Inventory"
        description="Track devices, ownership, serial numbers, locations and asset lifecycle status from one clean workspace."
        actions={
          <>
            <AppButton variant="outline" icon={<Download size={18} />}>
              Export
            </AppButton>

            <AppButton icon={<Plus size={18} />}>Add Hardware</AppButton>
          </>
        }
      />

      <section className="row g-3 mb-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div className="col-12 col-md-6 col-xl-3" key={metric.label}>
              <AppCard className="h-100 hardware-metric-card">
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <div>
                    <div className="text-muted small mb-2">{metric.label}</div>
                    <div className="hardware-metric-value">{metric.value}</div>
                    <div className="text-muted small mt-1">{metric.helper}</div>
                  </div>

                  <div
                    className={`hardware-metric-icon hardware-metric-${metric.tone}`}
                  >
                    <Icon size={22} />
                  </div>
                </div>
              </AppCard>
            </div>
          );
        })}
      </section>

      <AppCard noBody>
        <div className="card-body p-4 border-bottom">
          <div className="app-toolbar mb-3">
            <div>
              <h2 className="h5 fw-bold mb-1">Asset List</h2>
              <p className="text-muted mb-0">
                Manage all registered hardware assets.
              </p>
            </div>

            <button className="btn btn-light d-inline-flex align-items-center gap-2">
              <Filter size={18} />
              Filter
            </button>
          </div>

          <div className="hardware-filter-grid">
            <AppInput
              placeholder="Search asset, serial, owner or location..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              leftIcon={<Search size={18} />}
            />

            <AppSelect
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              options={categoryOptions}
            />

            <AppSelect
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              options={statusOptions}
            />
          </div>
        </div>

        {filteredItems.length > 0 ? (
          <AppTable>
            <thead>
              <tr>
                <th>Asset</th>
                <th>Serial No.</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Location</th>
                <th>Updated</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredItems.map((item) => {
                const Icon = getHardwareIcon(item.category);

                return (
                  <tr key={item.id}>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <div className="app-icon-box app-icon-box-sm">
                          <Icon size={17} />
                        </div>

                        <div>
                          <div className="fw-bold">{item.name}</div>
                          <div className="text-muted small">
                            {item.assetTag} · {item.brand} {item.model}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="hardware-serial">{item.serialNo}</span>
                    </td>

                    <td>{item.owner}</td>

                    <td>
                      <AppBadge tone={getStatusTone(item.status)}>
                        {item.status}
                      </AppBadge>
                    </td>

                    <td>{item.location}</td>

                    <td className="text-muted">{item.lastUpdated}</td>

                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-2">
                        <Eye size={15} />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </AppTable>
        ) : (
          <EmptyState
            title="No hardware found"
            description="Try changing your search keyword or filter selection."
            icon={<Laptop size={24} />}
          />
        )}
      </AppCard>
    </>
  );
}