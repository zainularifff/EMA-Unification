import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  Loader2,
  PlayCircle,
  RefreshCw,
  Search,
  Square,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import taskListService from "../services/taskListService";
import { EmaPageLayout, EmaSection } from "../components/ema/EmaPageLayout";
import { EmaSidebarActionButton, EmaSidebarPanel, EmaSidebarTreeRow } from "../components/ema/EmaSidebarPanel";
import { EmaKpiCard, EmaKpiGrid } from "../components/ema/EmaKpiCard";
import { EmaButton, EmaFilterField, EmaSearchInput, EmaToolbar } from "../components/ema/EmaToolbar";
import { EmaTable, EmaTableShell, type EmaTableColumn } from "../components/ema/EmaTable";
import { EmaPagination } from "../components/ema/EmaPagination";
import { EmaToastViewport, type EmaToastItem, type EmaToastTone } from "../components/ema/EmaToast";

type TaskState = string;
type TaskAction = "stop" | "cancel" | "delete";

type TaskItem = {
  id: number;
  jobId?: number;
  jobType?: number;
  jobStyle?: number;
  jobCommand?: number;
  jobStatus?: number;
  rawJobStatus?: number;
  effectiveJobStatus?: number;
  rawState?: string;
  effectiveStatusReason?: string;
  relatedStopJobId?: number;
  isTerminal?: boolean;
  isStopCommand?: boolean;
  isCancelCommand?: boolean;
  canStop?: boolean;
  canCancel?: boolean;
  canDelete?: boolean;
  actionDisabledReason?: string;
  classification: string;
  taskType: string;
  commandType: string;
  state: TaskState;
  description: string;
  startTime: string;
  endTime: string;
  scheduledTime: string;
  orderedBy: string;
  transferRate: number;
  completionRate: number;
  totalObjects: number;
  commandCompleted: number;
  taskCompleted: number;
  taskRunning: number;
  commandIncomplete: number;
  taskEnd: string;
  raw?: Record<string, unknown>;
};

type TargetItem = {
  id?: number;
  username: string;
  department: string;
  ipAddress: string;
  email: string;
  phoneNumber: string;
  lastConnection: string;
  objectRootIdn?: number;
  objectRelIdn?: number;
  objectDeviceID?: string;
  targetType?: string;
  raw?: Record<string, unknown>;
};

type TaskProgress = Pick<
  TaskItem,
  | "classification"
  | "startTime"
  | "transferRate"
  | "completionRate"
  | "totalObjects"
  | "commandCompleted"
  | "taskCompleted"
  | "taskRunning"
  | "commandIncomplete"
  | "taskEnd"
> & {
  jobId?: number;
  raw?: Record<string, unknown>;
};

type ProgressDetailItem = Record<string, unknown>;

type SelectOption = {
  code: number;
  label: string;
};

type TaskDetailPayload = {
  task: TaskItem;
  progress: TaskProgress;
  targets: TargetItem[];
  progressDetails: ProgressDetailItem[];
};

type ToastState = {
  tone: EmaToastTone;
  title: string;
  message: string;
};

type PendingAction = {
  action: TaskAction;
  task: TaskItem;
} | null;

type SortKey = keyof Pick<
  TaskItem,
  "id" | "classification" | "taskType" | "commandType" | "state" | "description" | "startTime" | "endTime" | "scheduledTime" | "orderedBy"
>;

const DEFAULT_TASK_CLASSIFICATIONS: SelectOption[] = [
  { code: -1, label: "All" },
  { code: 10100, label: "Hardware Inventory" },
  { code: 10200, label: "Software Inventory" },
  { code: 10600, label: "Network Inventory" },
  { code: 10500, label: "Software Distribution" },
  { code: 10700, label: "Patching" },
  { code: 10300, label: "Application Metering" },
  { code: 11200, label: "Send Message" },
];

const DEFAULT_TASK_STATES: SelectOption[] = [
  { code: -1, label: "All" },
  { code: 2200, label: "Transferring" },
  { code: 2201, label: "Running" },
  { code: 2202, label: "Transferred" },
  { code: 2203, label: "Stop" },
  { code: 2204, label: "Cancelled" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeString(value: unknown, fallback = "-") {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

function normalizeBoolean(value: unknown, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const text = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(text)) return true;
  if (["0", "false", "no", "n"].includes(text)) return false;
  return fallback;
}

function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function isTerminalState(state: unknown) {
  return ["transferred", "stop", "cancelled"].includes(String(state || "").trim().toLowerCase());
}

function clampPage(page: number, totalPages: number) {
  return Math.min(Math.max(page, 1), Math.max(totalPages, 1));
}

function normalizeTask(input: Partial<TaskItem> & Record<string, unknown>): TaskItem {
  const rawJobStatus = normalizeNumber(input.rawJobStatus ?? input.Raw_Job_Status ?? input.jobStatus ?? input.Job_Status, 0);
  const effectiveJobStatus = normalizeNumber(input.effectiveJobStatus ?? input.EffectiveJob_Status ?? input.jobStatus ?? input.Job_Status, rawJobStatus);
  const state = normalizeString(input.state ?? input.State, "-");
  const isTerminal = normalizeBoolean(input.isTerminal, isTerminalState(state));
  const actionDisabledReason = normalizeString(
    input.actionDisabledReason ?? input.ActionDisabledReason,
    isTerminal ? "Action disabled because this task is already completed, stopped, or cancelled." : ""
  );

  return {
    id: normalizeNumber(input.id ?? input.jobId ?? input.Job_Idn, 0),
    jobId: normalizeNumber(input.jobId ?? input.id ?? input.Job_Idn, 0),
    jobType: normalizeNumber(input.jobType ?? input.Job_Type, 0),
    jobStyle: normalizeNumber(input.jobStyle ?? input.Job_Style, 0),
    jobCommand: normalizeNumber(input.jobCommand ?? input.Job_Command, 0),
    rawJobStatus,
    effectiveJobStatus,
    jobStatus: effectiveJobStatus,
    rawState: normalizeString(input.rawState ?? input.RawState, state),
    effectiveStatusReason: normalizeString(input.effectiveStatusReason ?? input.EffectiveStatusReason, ""),
    relatedStopJobId: normalizeNumber(input.relatedStopJobId ?? input.RelatedStopJob_Idn, 0),
    isTerminal,
    isStopCommand: normalizeBoolean(input.isStopCommand, false),
    isCancelCommand: normalizeBoolean(input.isCancelCommand, false),
    canStop: normalizeBoolean(input.canStop ?? input.CanStop, !isTerminal),
    canCancel: normalizeBoolean(input.canCancel ?? input.CanCancel, !isTerminal),
    canDelete: normalizeBoolean(input.canDelete ?? input.CanDelete, true),
    actionDisabledReason,
    classification: normalizeString(input.classification ?? input.Classification, "-"),
    taskType: normalizeString(input.taskType ?? input.TaskType, "-"),
    commandType: normalizeString(input.commandType ?? input.CommandType, "-"),
    state,
    description: normalizeString(input.description ?? input.Description, "-"),
    startTime: normalizeString(input.startTime ?? input.StartTime ?? input.Job_StartTime, "-"),
    endTime: normalizeString(input.endTime ?? input.EndTime ?? input.Job_EndTime, "-"),
    scheduledTime: normalizeString(input.scheduledTime ?? input.ScheduledTime ?? input.Job_ScheduledTime, "-"),
    orderedBy: normalizeString(input.orderedBy ?? input.OrderedBy ?? input.Login_Name, "-"),
    transferRate: normalizeNumber(input.transferRate ?? input.TransferRate, 0),
    completionRate: normalizeNumber(input.completionRate ?? input.CompletionRate, 0),
    totalObjects: normalizeNumber(input.totalObjects ?? input.TotalObjects, 0),
    commandCompleted: normalizeNumber(input.commandCompleted ?? input.CommandCompleted, 0),
    taskCompleted: normalizeNumber(input.taskCompleted ?? input.TaskCompleted, 0),
    taskRunning: normalizeNumber(input.taskRunning ?? input.TaskRunning, 0),
    commandIncomplete: normalizeNumber(input.commandIncomplete ?? input.CommandIncomplete, 0),
    taskEnd: normalizeString(input.taskEnd ?? input.TaskEnd, "-"),
    raw: input.raw as Record<string, unknown> | undefined,
  };
}

function normalizeTarget(input: Partial<TargetItem> & Record<string, unknown>, index: number): TargetItem {
  return {
    id: normalizeNumber(input.id ?? input.Object_Root_Idn ?? index + 1, index + 1),
    username: normalizeString(input.username ?? input.ComputerName ?? input.Object_DeviceID, `Target ${index + 1}`),
    department: normalizeString(input.department ?? input.Object_Full_Name ?? input.Object_Rel_Name, "-"),
    ipAddress: normalizeString(input.ipAddress ?? input.IP ?? input.IPAddress, "-"),
    email: normalizeString(input.email ?? input.Email, "-"),
    phoneNumber: normalizeString(input.phoneNumber ?? input.Phone, "-"),
    lastConnection: normalizeString(input.lastConnection ?? input.ConnectionTime, "-"),
    objectRootIdn: normalizeNumber(input.objectRootIdn ?? input.Object_Root_Idn, 0),
    objectRelIdn: normalizeNumber(input.objectRelIdn ?? input.Object_Rel_Idn, 0),
    objectDeviceID: normalizeString(input.objectDeviceID ?? input.Object_DeviceID, ""),
    targetType: normalizeString(input.targetType ?? input.TargetType, "client"),
    raw: input.raw as Record<string, unknown> | undefined,
  };
}

function normalizeProgress(input: Partial<TaskProgress> & Record<string, unknown>, fallbackTask?: TaskItem | null): TaskProgress {
  return {
    jobId: normalizeNumber(input.jobId ?? input.Job_Idn ?? fallbackTask?.id, fallbackTask?.id || 0),
    classification: normalizeString(input.classification ?? input.Classification, fallbackTask?.classification || "-"),
    startTime: normalizeString(input.startTime ?? input.StartTime, fallbackTask?.startTime || "-"),
    transferRate: normalizeNumber(input.transferRate ?? input.TransferRate, fallbackTask?.transferRate || 0),
    completionRate: normalizeNumber(input.completionRate ?? input.CompletionRate, fallbackTask?.completionRate || 0),
    totalObjects: normalizeNumber(input.totalObjects ?? input.TotalObjects, fallbackTask?.totalObjects || 0),
    commandCompleted: normalizeNumber(input.commandCompleted ?? input.CommandCompleted, fallbackTask?.commandCompleted || 0),
    taskCompleted: normalizeNumber(input.taskCompleted ?? input.TaskCompleted, fallbackTask?.taskCompleted || 0),
    taskRunning: normalizeNumber(input.taskRunning ?? input.TaskRunning, fallbackTask?.taskRunning || 0),
    commandIncomplete: normalizeNumber(input.commandIncomplete ?? input.CommandIncomplete, fallbackTask?.commandIncomplete || 0),
    taskEnd: normalizeString(input.taskEnd ?? input.TaskEnd, fallbackTask?.taskEnd || "-"),
    raw: input.raw as Record<string, unknown> | undefined,
  };
}

function readDetailValue(row: ProgressDetailItem, keys: string[], fallback = "-") {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") return String(value);
  }
  return fallback;
}

function resolveProgressStatus(row: ProgressDetailItem, states: SelectOption[]) {
  const raw = readDetailValue(row, ["statusLabel", "StatusLabel", "State", "state", "status"], "");
  if (raw) return raw;
  const code = Number(readDetailValue(row, ["EffectiveJob_Status", "effectiveJobStatus", "rowStatus", "Job_Status", "jobStatus"], "0"));
  return states.find((item) => item.code === code)?.label || (code ? `Status ${code}` : "-");
}

function canRunTaskAction(action: TaskAction, task: TaskItem | null) {
  if (!task) return false;
  if (action === "stop") return task.canStop !== false;
  if (action === "cancel") return task.canCancel !== false;
  if (action === "delete") return task.canDelete !== false;
  return false;
}

function getTaskActionDisabledTitle(action: TaskAction, task: TaskItem) {
  if (canRunTaskAction(action, task)) {
    if (action === "stop") return "Stop task";
    if (action === "cancel") return "Cancel task";
    return "Delete task";
  }
  return task.actionDisabledReason || "Action disabled because this task is already completed, stopped, or cancelled.";
}

function getSortValue(task: TaskItem, key: SortKey) {
  if (key === "id") return task.id;
  return String(task[key] ?? "").toLowerCase();
}

function getTaskStateInsight(task: TaskItem | null) {
  if (!task) return "";
  if (task.effectiveStatusReason === "matched_later_stop_metering_job") {
    return `State is synced from stop metering command${task.relatedStopJobId ? ` #${task.relatedStopJobId}` : ""}. The original raw state can remain ${task.rawState || "Transferring"}, but Task List displays the final operational state.`;
  }
  if (task.rawState && task.rawState !== task.state) return `Displayed state is ${task.state}. Raw database state is ${task.rawState}.`;
  if (task.isTerminal) return task.actionDisabledReason || "This task is already in a final state. Stop and cancel actions are locked.";
  return "Task is still actionable based on the latest state returned by the API.";
}

function getStateTone(state: string): "blue" | "emerald" | "amber" | "rose" | "violet" | "slate" {
  const text = String(state || "").toLowerCase();
  if (text.includes("running")) return "blue";
  if (text.includes("transfer") && !text.includes("transferring")) return "emerald";
  if (text.includes("transferring")) return "violet";
  if (text.includes("stop") || text.includes("cancel")) return "rose";
  if (text.includes("pending") || text.includes("wait")) return "amber";
  return "slate";
}

function badgeClass(tone: ReturnType<typeof getStateTone>) {
  const map = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  };
  return map[tone];
}

function SortButton({ label, sortKey, activeKey, direction, onClick }: { label: string; sortKey: SortKey; activeKey: SortKey; direction: "asc" | "desc"; onClick: () => void }) {
  const active = activeKey === sortKey;
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 font-black uppercase tracking-[0.08em] text-slate-600 hover:text-blue-700">
      <span>{label}</span>
      <span className="text-[10px] text-slate-400">{active ? (direction === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  );
}

function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.min(100, Math.max(0, value || 0));
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${safeValue}%` }} />
    </div>
  );
}

function FieldValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-extrabold text-slate-900">{value}</div>
    </div>
  );
}

export default function TaskList() {
  const [classification, setClassification] = useState("All");
  const [state, setState] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [taskDetail, setTaskDetail] = useState<TaskDetailPayload | null>(null);
  const [progressDetails, setProgressDetails] = useState<ProgressDetailItem[]>([]);
  const [targets, setTargets] = useState<TargetItem[]>([]);
  const [classificationOptions, setClassificationOptions] = useState<SelectOption[]>(DEFAULT_TASK_CLASSIFICATIONS);
  const [stateOptions, setStateOptions] = useState<SelectOption[]>(DEFAULT_TASK_STATES);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isProgressLoading, setIsProgressLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "id", direction: "desc" });
  const [toast, setToast] = useState<ToastState | null>(null);
  const selectedTaskIdRef = useRef<number | null>(null);

  useEffect(() => {
    selectedTaskIdRef.current = selectedTaskId;
  }, [selectedTaskId]);

  const toastItems = useMemo<EmaToastItem[]>(() => (toast ? [{ id: "task-toast", tone: toast.tone, title: toast.title, message: toast.message }] : []), [toast]);

  const showToast = useCallback((nextToast: ToastState) => {
    setToast(nextToast);
    window.setTimeout(() => {
      setToast((current) => (current === nextToast ? null : current));
    }, 3200);
  }, []);

  const loadOptions = useCallback(async () => {
    try {
      const response = await taskListService.getOptions<{ classifications: SelectOption[]; states: SelectOption[] }>();
      setClassificationOptions(response.data?.classifications?.length ? response.data.classifications : DEFAULT_TASK_CLASSIFICATIONS);
      setStateOptions(response.data?.states?.length ? response.data.states : DEFAULT_TASK_STATES);
    } catch (error) {
      setClassificationOptions(DEFAULT_TASK_CLASSIFICATIONS);
      setStateOptions(DEFAULT_TASK_STATES);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await taskListService.searchTasks<TaskItem[]>({
        classification,
        state,
        fromDate,
        job_starttime: fromDate,
        limit: 1000,
      });
      const normalized = asArray<TaskItem>(response.data).map((task) => normalizeTask(task as TaskItem & Record<string, unknown>));
      setTasks(normalized);
      const currentSelectedTaskId = selectedTaskIdRef.current;
      if (currentSelectedTaskId && !normalized.some((task) => task.id === currentSelectedTaskId)) {
        setSelectedTaskId(null);
        setTaskDetail(null);
        setTargets([]);
        setProgressDetails([]);
        setIsDetailOpen(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load task list.";
      setErrorMessage(message);
      showToast({ tone: "error", title: "Task API Error", message });
    } finally {
      setIsLoading(false);
    }
  }, [classification, fromDate, showToast, state]);

  const loadTaskDetail = useCallback(
    async (taskId: number) => {
      setIsDetailLoading(true);
      setIsProgressLoading(true);
      setErrorMessage("");
      try {
        const response = await taskListService.getTaskDetail<TaskDetailPayload>(taskId);
        const detail = response.data || ({} as TaskDetailPayload);
        const normalizedTask = normalizeTask((detail.task || {}) as TaskItem & Record<string, unknown>);
        const normalizedProgress = normalizeProgress((detail.progress || {}) as TaskProgress & Record<string, unknown>, normalizedTask);
        const normalizedTargets = asArray<TargetItem>(detail.targets).map((target, index) => normalizeTarget(target as TargetItem & Record<string, unknown>, index));
        const normalizedProgressDetails = asArray<ProgressDetailItem>(detail.progressDetails);

        setTaskDetail({
          task: normalizedTask,
          progress: normalizedProgress,
          targets: normalizedTargets,
          progressDetails: normalizedProgressDetails,
        });
        setTargets(normalizedTargets);
        setProgressDetails(normalizedProgressDetails);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load task detail.";
        setErrorMessage(message);
        showToast({ tone: "error", title: "Detail API Error", message });
      } finally {
        setIsDetailLoading(false);
        setIsProgressLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    setCurrentPage(1);
  }, [classification, state, fromDate, searchTerm, pageSize]);

  const taskStats = useMemo(() => {
    const matches = (value: string) => tasks.filter((task) => task.state.toLowerCase() === value).length;
    const completion = tasks.length ? Math.round(tasks.reduce((sum, task) => sum + task.completionRate, 0) / tasks.length) : 0;
    return {
      total: tasks.length,
      running: matches("running"),
      transferring: matches("transferring"),
      transferred: matches("transferred"),
      stopped: matches("stop"),
      cancelled: matches("cancelled"),
      completion,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return [...tasks]
      .filter((task) => {
        if (!keyword) return true;
        return [task.id, task.classification, task.taskType, task.commandType, task.state, task.description, task.orderedBy]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      })
      .sort((a, b) => {
        const valueA = getSortValue(a, sortConfig.key);
        const valueB = getSortValue(b, sortConfig.key);
        if (valueA < valueB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valueA > valueB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
  }, [searchTerm, sortConfig, tasks]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredTasks.length / pageSize)), [filteredTasks.length, pageSize]);

  useEffect(() => {
    setCurrentPage((page) => clampPage(page, totalPages));
  }, [totalPages]);

  const safePage = clampPage(currentPage, totalPages);
  const pageStart = filteredTasks.length ? (safePage - 1) * pageSize + 1 : 0;
  const paginatedTasks = useMemo(() => filteredTasks.slice((safePage - 1) * pageSize, (safePage - 1) * pageSize + pageSize), [filteredTasks, pageSize, safePage]);
  const pageEnd = filteredTasks.length ? Math.min(pageStart + paginatedTasks.length - 1, filteredTasks.length) : 0;

  const selectedTask = useMemo(() => taskDetail?.task || tasks.find((task) => task.id === selectedTaskId) || null, [selectedTaskId, taskDetail, tasks]);
  const selectedProgress = useMemo(() => (taskDetail?.progress ? taskDetail.progress : selectedTask ? normalizeProgress({}, selectedTask) : null), [selectedTask, taskDetail]);
  const hasFilters = classification !== "All" || state !== "All" || searchTerm || fromDate;

  const handleSort = (key: SortKey) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const openTaskDetails = async (taskId: number) => {
    setIsDetailOpen(true);
    if (selectedTaskId === taskId && taskDetail?.task?.id === taskId) return;
    setSelectedTaskId(taskId);
    await loadTaskDetail(taskId);
  };

  const resetFilters = () => {
    setClassification("All");
    setState("All");
    setSearchTerm("");
    setFromDate("");
    setCurrentPage(1);
  };

  const requestTaskAction = (action: TaskAction, task: TaskItem) => {
    if (!canRunTaskAction(action, task)) {
      showToast({ tone: "info", title: "Action Disabled", message: task.actionDisabledReason || "This task action is disabled because the task state is already final." });
      return;
    }
    setPendingAction({ action, task });
  };

  const confirmTaskAction = async () => {
    if (!pendingAction) return;
    setIsActionLoading(true);
    try {
      const response = await taskListService.runTaskAction<Record<string, unknown>>(pendingAction.task.id, { action: pendingAction.action });
      showToast({
        tone: pendingAction.action === "delete" ? "error" : "success",
        title: `Task ${pendingAction.action}`,
        message: response.message || `Task #${pendingAction.task.id} ${pendingAction.action} successful.`,
      });
      const affectedTaskId = pendingAction.task.id;
      const action = pendingAction.action;
      setPendingAction(null);
      await loadTasks();
      if (action === "delete") {
        setIsDetailOpen(false);
        setSelectedTaskId(null);
        setTaskDetail(null);
        setTargets([]);
        setProgressDetails([]);
      } else if (isDetailOpen) {
        await loadTaskDetail(affectedTaskId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to perform task action.";
      showToast({ tone: "error", title: "Action Failed", message });
    } finally {
      setIsActionLoading(false);
    }
  };

  const exportTasks = () => {
    const headers = ["Job ID", "Classification", "Task Type", "Command", "State", "Description", "Start Time", "End Time", "Scheduled Time", "Ordered By", "Transfer Rate", "Completion Rate", "Total Objects"];
    const rows = filteredTasks.map((task) => [
      task.id,
      task.classification,
      task.taskType,
      task.commandType,
      task.state,
      task.description,
      task.startTime,
      task.endTime,
      task.scheduledTime,
      task.orderedBy,
      `${task.transferRate}%`,
      `${task.completionRate}%`,
      task.totalObjects,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `task-list-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const tableColumns: EmaTableColumn<TaskItem>[] = [
    {
      key: "no",
      header: "No",
      width: "4rem",
      render: (_task, index) => <span className="text-xs font-black text-slate-500">{String(pageStart + index).padStart(2, "0")}</span>,
    },
    {
      key: "job",
      header: <SortButton label="Job" sortKey="id" activeKey={sortConfig.key} direction={sortConfig.direction} onClick={() => handleSort("id")} />,
      render: (task) => (
        <button type="button" onClick={() => openTaskDetails(task.id)} className="text-left">
          <span className="block text-sm font-black text-blue-700">#{task.id}</span>
          <span className="block max-w-[28rem] truncate text-xs font-semibold text-slate-500">{task.description || task.commandType || task.taskType || "Task command"}</span>
        </button>
      ),
    },
    {
      key: "classification",
      header: <SortButton label="Classification" sortKey="classification" activeKey={sortConfig.key} direction={sortConfig.direction} onClick={() => handleSort("classification")} />,
      render: (task) => <span className="font-bold text-slate-800">{task.classification}</span>,
    },
    {
      key: "state",
      header: <SortButton label="State" sortKey="state" activeKey={sortConfig.key} direction={sortConfig.direction} onClick={() => handleSort("state")} />,
      render: (task) => <span className={cx("inline-flex rounded-full border px-3 py-1 text-xs font-black", badgeClass(getStateTone(task.state)))}>{task.state}</span>,
    },
    {
      key: "schedule",
      header: <SortButton label="Schedule" sortKey="startTime" activeKey={sortConfig.key} direction={sortConfig.direction} onClick={() => handleSort("startTime")} />,
      render: (task) => (
        <span className="block min-w-[11rem]">
          <span className="block text-sm font-bold text-slate-900">{task.startTime || "-"}</span>
          <span className="block text-xs font-semibold text-slate-500">{task.endTime && task.endTime !== "-" ? task.endTime : "No end time"}</span>
        </span>
      ),
    },
    {
      key: "orderedBy",
      header: <SortButton label="Ordered By" sortKey="orderedBy" activeKey={sortConfig.key} direction={sortConfig.direction} onClick={() => handleSort("orderedBy")} />,
      render: (task) => <span className="font-semibold text-slate-700">{task.orderedBy || "-"}</span>,
    },
    {
      key: "action",
      header: "Action",
      align: "right",
      width: "10rem",
      render: (task) => (
        <div className="flex justify-end gap-1">
          <button type="button" title="View detail" onClick={() => openTaskDetails(task.id)} className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700">
            <Eye size={14} />
          </button>
          <button type="button" title={getTaskActionDisabledTitle("stop", task)} disabled={!canRunTaskAction("stop", task)} onClick={() => requestTaskAction("stop", task)} className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-40">
            <Square size={13} />
          </button>
          <button type="button" title={getTaskActionDisabledTitle("cancel", task)} disabled={!canRunTaskAction("cancel", task)} onClick={() => requestTaskAction("cancel", task)} className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40">
            <X size={13} />
          </button>
          <button type="button" title={getTaskActionDisabledTitle("delete", task)} disabled={!canRunTaskAction("delete", task)} onClick={() => requestTaskAction("delete", task)} className="grid size-8 place-items-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-40">
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  const sidebar = (
    <EmaSidebarPanel eyebrow="Operations Control" title="Task Scope" description="Filter job classification and execution state." searchValue={searchTerm} searchPlaceholder="Search task / command..." onSearchChange={setSearchTerm} action={<EmaSidebarActionButton onClick={resetFilters} disabled={!hasFilters}><X size={14} /> Reset Filters</EmaSidebarActionButton>}>
      <div className="space-y-4">
        <div>
          <p className="mb-2 px-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Classification</p>
          <div className="space-y-1">
            {classificationOptions.map((option) => (
              <EmaSidebarTreeRow key={`${option.code}-${option.label}`} active={classification === option.label} onClick={() => setClassification(option.label)}>
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500"><ClipboardList size={15} /></span>
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
              </EmaSidebarTreeRow>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 px-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">State</p>
          <div className="space-y-1">
            {stateOptions.map((option) => (
              <EmaSidebarTreeRow key={`${option.code}-${option.label}`} active={state === option.label} onClick={() => setState(option.label)}>
                <span className={cx("grid size-8 shrink-0 place-items-center rounded-xl border", option.label === "All" ? "border-slate-200 bg-slate-100 text-slate-500" : badgeClass(getStateTone(option.label)))}>
                  <CheckCircle2 size={15} />
                </span>
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
              </EmaSidebarTreeRow>
            ))}
          </div>
        </div>
      </div>
    </EmaSidebarPanel>
  );

  return (
    <EmaPageLayout sidebar={sidebar} fullHeight>
      <EmaToastViewport items={toastItems} onClose={() => setToast(null)} />

      <div className="space-y-3">
        <EmaSection eyebrow="Task List" title="Command Job Monitor" description="Monitor task execution state, endpoint delivery status and operational controls.">
          <EmaKpiGrid>
            <EmaKpiCard title="Total Tasks" value={taskStats.total} note={`${filteredTasks.length} visible records`} icon={<ClipboardList size={19} />} tone="blue" onClick={() => setState("All")} active={state === "All"} />
            <EmaKpiCard title="Running" value={taskStats.running} note="Active execution" icon={<PlayCircle size={19} />} tone="emerald" onClick={() => setState("Running")} active={state === "Running"} />
            <EmaKpiCard title="Transferring" value={taskStats.transferring} note="In progress" icon={<RefreshCw size={19} />} tone="violet" onClick={() => setState("Transferring")} active={state === "Transferring"} />
            <EmaKpiCard title="Completed" value={taskStats.transferred} note="Transferred" icon={<CheckCircle2 size={19} />} tone="blue" onClick={() => setState("Transferred")} active={state === "Transferred"} />
            <EmaKpiCard title="Stopped / Cancelled" value={taskStats.stopped + taskStats.cancelled} note={`${taskStats.completion}% avg completion`} icon={<Square size={19} />} tone="rose" />
          </EmaKpiGrid>
        </EmaSection>

        <EmaToolbar
          search={<EmaSearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search job ID, command, task, state or ordered by..." />}
          filters={
            <>
              <EmaFilterField label="Classification">
                <select value={classification} onChange={(event) => setClassification(event.target.value)} className="h-10 min-w-[14rem] rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50">
                  {classificationOptions.map((item) => <option key={item.code} value={item.label}>{item.label}</option>)}
                </select>
              </EmaFilterField>
              <EmaFilterField label="State">
                <select value={state} onChange={(event) => setState(event.target.value)} className="h-10 min-w-[12rem] rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50">
                  {stateOptions.map((item) => <option key={item.code} value={item.label}>{item.label}</option>)}
                </select>
              </EmaFilterField>
              <EmaFilterField label="From">
                <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50" />
              </EmaFilterField>
              <EmaFilterField label="Rows">
                <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="h-10 min-w-[8rem] rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50">
                  {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option} / page</option>)}
                </select>
              </EmaFilterField>
            </>
          }
          right={
            <>
              <EmaButton onClick={() => void loadTasks()} disabled={isLoading} variant="secondary">
                {isLoading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Refresh
              </EmaButton>
              <EmaButton onClick={exportTasks} disabled={!filteredTasks.length} variant="secondary">
                <Download size={15} /> Export CSV
              </EmaButton>
              <EmaButton onClick={resetFilters} disabled={!hasFilters} variant="ghost">
                <X size={15} /> Reset
              </EmaButton>
            </>
          }
        />

        {errorMessage ? (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        <EmaTableShell
          title="Task List Records"
          subtitle={`Showing ${pageStart}-${pageEnd} of ${filteredTasks.length} records. Completed ${taskStats.transferred}, transferring ${taskStats.transferring}, stopped ${taskStats.stopped}.`}
        >
          <EmaTable columns={tableColumns} rows={paginatedTasks} getRowKey={(task) => task.id} loading={isLoading} emptyText="No task records available." />
          {!isLoading && filteredTasks.length > 0 ? (
            <EmaPagination page={safePage} totalPages={totalPages} totalLabel={`Showing ${pageStart}-${pageEnd} of ${filteredTasks.length}`} onPageChange={(page) => setCurrentPage(clampPage(page, totalPages))} />
          ) : null}
        </EmaTableShell>
      </div>

      {isDetailOpen && selectedTask ? (
        <TaskDetailDrawer
          task={selectedTask}
          progress={selectedProgress}
          targets={targets}
          progressDetails={progressDetails}
          stateOptions={stateOptions}
          isLoading={isDetailLoading}
          isProgressLoading={isProgressLoading}
          onClose={() => setIsDetailOpen(false)}
          onRefresh={() => selectedTaskId && loadTaskDetail(selectedTaskId)}
          onAction={requestTaskAction}
        />
      ) : null}

      {pendingAction ? (
        <TaskActionModal pendingAction={pendingAction} isLoading={isActionLoading} onCancel={() => setPendingAction(null)} onConfirm={confirmTaskAction} />
      ) : null}
    </EmaPageLayout>
  );
}

function TaskDetailDrawer({ task, progress, targets, progressDetails, stateOptions, isLoading, isProgressLoading, onClose, onRefresh, onAction }: { task: TaskItem; progress: TaskProgress | null; targets: TargetItem[]; progressDetails: ProgressDetailItem[]; stateOptions: SelectOption[]; isLoading: boolean; isProgressLoading: boolean; onClose: () => void; onRefresh: () => void; onAction: (action: TaskAction, task: TaskItem) => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/30 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex h-full w-full max-w-6xl flex-col overflow-hidden bg-slate-100 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-4">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">Task Detail</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">Task #{task.id}</h2>
            <p className="mt-1 truncate text-sm font-semibold text-slate-500">{task.commandType || task.taskType || task.description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <EmaButton onClick={onRefresh} disabled={isLoading} variant="secondary">
              {isLoading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Refresh
            </EmaButton>
            <EmaButton onClick={onClose} variant="ghost">
              <X size={15} /> Close
            </EmaButton>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          <div className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
            <div className="space-y-4">
              
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h4 className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 mb-3">Task Information</h4>
                <div className="space-y-2 text-sm text-slate-700">
                  <div className="flex justify-between items-center py-1"><span>State</span><strong className="font-black text-slate-900">{task.state}</strong></div>
                  {task.rawState && task.rawState !== task.state ? <div className="flex justify-between items-center py-1"><span>Raw State</span><strong className="font-black text-slate-900">{task.rawState}</strong></div> : null}
                  <div className="flex justify-between items-center py-1 border-t border-slate-100"><span>Task Type</span><strong className="font-black text-slate-900">{task.taskType}</strong></div>
                  <div className="flex justify-between items-center py-1 border-t border-slate-100"><span>Ordered By</span><strong className="font-black text-slate-900">{task.orderedBy}</strong></div>
                  <div className="flex justify-between items-center py-1 border-t border-slate-100"><span>Start</span><strong className="font-black text-slate-900">{task.startTime}</strong></div>
                  <div className="flex justify-between items-center py-1 border-t border-slate-100"><span>End</span><strong className="font-black text-slate-900">{task.endTime}</strong></div>
                  <div className="flex justify-between items-center py-1 border-t border-slate-100"><span>Targets</span><strong className="font-black text-slate-900">{task.totalObjects}</strong></div>
                </div>

                <div className={cx("mt-4 rounded-xl border p-3", task.isTerminal ? "border-amber-200 bg-amber-50" : "border-blue-200 bg-blue-50")}>
                  <h5 className={cx("text-xs font-black uppercase tracking-wider", task.isTerminal ? "text-amber-800" : "text-blue-800")}>{task.isTerminal ? "Operational Lock" : "Operational Note"}</h5>
                  <p className={cx("mt-1 text-sm font-semibold", task.isTerminal ? "text-amber-900" : "text-blue-900")}>{task.description}</p>
                  <p className={cx("mt-2 text-xs font-medium italic", task.isTerminal ? "text-amber-700" : "text-blue-700")}>{getTaskStateInsight(task)}</p>
                </div>
              </div>

              <TaskProcedureStatus task={task} progress={progress} />

              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Task Action</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button type="button" title={getTaskActionDisabledTitle("stop", task)} disabled={!canRunTaskAction("stop", task)} onClick={() => onAction("stop", task)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 text-sm font-black text-amber-700 disabled:opacity-40">
                    <Square size={14} /> Stop
                  </button>
                  <button type="button" title={getTaskActionDisabledTitle("cancel", task)} disabled={!canRunTaskAction("cancel", task)} onClick={() => onAction("cancel", task)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-700 disabled:opacity-40">
                    <X size={14} /> Cancel
                  </button>
                  <button type="button" title={getTaskActionDisabledTitle("delete", task)} disabled={!canRunTaskAction("delete", task)} onClick={() => onAction("delete", task)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 text-sm font-black text-rose-700 disabled:opacity-40">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </section>
            </div>

            <TaskTargetList task={task} targets={targets} progressDetails={progressDetails} stateOptions={stateOptions} isLoading={isProgressLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskProcedureStatus({ task, progress }: { task: TaskItem | null; progress: TaskProgress | null }) {
  const display = progress || (task ? normalizeProgress({}, task) : null);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100"><CheckCircle2 size={19} /></span>
        <div>
          <h3 className="text-base font-black text-slate-950">Task Procedure Status</h3>
          <p className="text-sm font-semibold text-slate-500">Live progress returned by status and detail.</p>
        </div>
      </div>

      {display ? (
        <div className="mt-4 space-y-3">
          <FieldValue label="Classification" value={display.classification} />
          <FieldValue label="Start Time" value={display.startTime} />
          <FieldValue label="Task Transfer Rate" value={<><span>{display.transferRate}%</span><div className="mt-2"><ProgressBar value={display.transferRate} /></div></>} />
          <FieldValue label="Task Completion Rate" value={<><span>{display.completionRate}%</span><div className="mt-2"><ProgressBar value={display.completionRate} /></div></>} />

          <div className="grid grid-cols-2 gap-3">
            <FieldValue label="Total Objects" value={display.totalObjects} />
            <FieldValue label="Command Completed" value={display.commandCompleted} />
            <FieldValue label="Task Completed" value={display.taskCompleted} />
            <FieldValue label="Task Running" value={display.taskRunning} />
            <FieldValue label="Incomplete" value={display.commandIncomplete} />
            <FieldValue label="Task End" value={display.taskEnd} />
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">Select one task to view procedure status.</div>
      )}
    </section>
  );
}

function TaskTargetList({ task, targets, progressDetails, stateOptions, isLoading }: { task: TaskItem | null; targets: TargetItem[]; progressDetails: ProgressDetailItem[]; stateOptions: SelectOption[]; isLoading: boolean }) {
  const [targetSearch, setTargetSearch] = useState("");
  const hasExecutionRows = progressDetails.length > 0;

  const targetLookup = useMemo(() => {
    const lookup = new Map<string, TargetItem>();
    targets.forEach((target) => {
      if (target.objectRootIdn) lookup.set(String(target.objectRootIdn), target);
      if (target.username) lookup.set(target.username.toLowerCase(), target);
      if (target.objectDeviceID) lookup.set(target.objectDeviceID.toLowerCase(), target);
    });
    return lookup;
  }, [targets]);

  const displayRows = useMemo(() => {
    return hasExecutionRows
      ? progressDetails.map((row, index) => {
          const status = resolveProgressStatus(row, stateOptions);
          const objectRoot = readDetailValue(row, ["Object_Root_Idn", "objectRootIdn"], "");
          const deviceName = readDetailValue(row, ["ComputerName", "DeviceName", "Object_Client_Name", "TargetName", "Object_DeviceID", "DeviceID"], `Target ${index + 1}`);
          const deviceId = readDetailValue(row, ["Object_DeviceID", "objectDeviceID", "DeviceID", "deviceID", "deviceId"], "");
          const matchedTarget = targetLookup.get(objectRoot) || targetLookup.get(deviceName.toLowerCase()) || targetLookup.get(deviceId.toLowerCase());
          return {
            key: `progress-${objectRoot}-${deviceId}-${index}`,
            name: deviceName,
            department: readDetailValue(row, ["Object_Full_Name", "Department", "department", "Object_Rel_Name"], matchedTarget?.department || "-"),
            ipAddress: readDetailValue(row, ["IP", "IPAddress", "ipAddress", "DeviceIPAddress", "DeviceLocalIPAddress"], matchedTarget?.ipAddress || "-"),
            type: matchedTarget?.targetType || "endpoint",
            status,
            lastActivity: readDetailValue(row, ["LastChangedTime", "lastChangedTime", "History_LastChangedTime", "ConnectionTime"], matchedTarget?.lastConnection || "-"),
            deviceId: deviceId || matchedTarget?.objectDeviceID || "-",
          };
        })
      : targets.map((target, index) => ({
          key: `target-${target.username}-${target.objectRootIdn || index}`,
          name: target.username,
          department: target.department,
          ipAddress: target.ipAddress,
          type: target.targetType || "client",
          status: task?.state || "-",
          lastActivity: target.lastConnection,
          deviceId: target.objectDeviceID || "-",
        }));
  }, [hasExecutionRows, progressDetails, stateOptions, targetLookup, targets, task?.state]);

  const filteredRows = useMemo(() => {
    const query = targetSearch.trim().toLowerCase();
    if (!query) return displayRows;
    return displayRows.filter((row) => [row.name, row.department, row.ipAddress, row.type, row.status, row.lastActivity, row.deviceId].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [displayRows, targetSearch]);

  const columns: EmaTableColumn<(typeof displayRows)[number]>[] = [
    { key: "name", header: hasExecutionRows ? "Device / Target" : "Assigned Scope", render: (row) => <strong className="font-black text-slate-900">{row.name}</strong> },
    { key: "department", header: "Branch", render: (row) => row.department },
    { key: "ip", header: "IP Address", render: (row) => row.ipAddress },
    { key: "type", header: "Type", render: (row) => row.type },
    { key: "status", header: "Status", render: (row) => <span className={cx("inline-flex rounded-full border px-3 py-1 text-xs font-black", badgeClass(getStateTone(row.status)))}>{row.status}</span> },
    { key: "activity", header: hasExecutionRows ? "Last Changed" : "Last Connection", render: (row) => row.lastActivity },
    { key: "device", header: "Device ID", render: (row) => <code className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{row.deviceId}</code> },
  ];

  return (
    <EmaTableShell
      title="Target Endpoint List"
      subtitle={`${filteredRows.length} of ${displayRows.length} endpoint row${displayRows.length === 1 ? "" : "s"}.`}
      toolbar={<EmaSearchInput value={targetSearch} onChange={setTargetSearch} placeholder="Search target, IP, status, device ID..." />}
    >
      <EmaTable columns={columns} rows={filteredRows} getRowKey={(row) => row.key} loading={isLoading} emptyText={targetSearch ? "No target matches your search." : "No target endpoint returned for this task."} />
    </EmaTableShell>
  );
}

function TaskActionModal({ pendingAction, isLoading, onCancel, onConfirm }: { pendingAction: NonNullable<PendingAction>; isLoading: boolean; onCancel: () => void; onConfirm: () => void }) {
  const tone = pendingAction.action === "delete" ? "rose" : pendingAction.action === "stop" ? "amber" : "slate";
  const title = pendingAction.action === "delete" ? "Delete Task" : pendingAction.action === "cancel" ? "Cancel Task" : "Stop Task";
  
  const description = pendingAction.action === "delete"
    ? "This will archive TS_JOB and TS_JOB_DEST into delete history tables, then remove the active rows. TS_JOB_HISTORY will remain untouched."
    : pendingAction.action === "cancel"
      ? "This will update the selected job status to Cancelled."
      : "This will update the selected job status to Stop.";

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Confirm Action</p>
          <h3 className="mt-1 text-lg font-black capitalize text-slate-950">{title} #{pendingAction.task.id}</h3>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">{description}</p>
        </div>
        <div className="p-5">
          <div className={cx("rounded-xl border p-4 text-sm font-bold", tone === "rose" && "border-rose-200 bg-rose-50 text-rose-700", tone === "amber" && "border-amber-200 bg-amber-50 text-amber-700", tone === "slate" && "border-slate-200 bg-slate-50 text-slate-700")}>
            {pendingAction.task.description || pendingAction.task.commandType || "Selected task"}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4">
          <EmaButton onClick={onCancel} disabled={isLoading} variant="secondary">Cancel</EmaButton>
          <EmaButton onClick={onConfirm} disabled={isLoading} variant={pendingAction.action === "delete" ? "danger" : "primary"}>
            {isLoading ? <Loader2 size={15} className="animate-spin" /> : null}
            Confirm
          </EmaButton>
        </div>
      </div>
    </div>
  );
}