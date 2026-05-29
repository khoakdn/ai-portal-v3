export type TaskStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "needs_revisions";

export type TaskType    = "content_draft" | "invoice";
export type ContentType = "press_release" | "social_post";

export type TaskActivityAction =
  | "draft_saved"
  | "submitted"
  | "approved"
  | "rejected"
  | "changes_requested"
  | "resubmitted"
  | "assigned";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: "member" | "manager" | "admin";
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  type: TaskType;
  status: TaskStatus;
  version: number;
  created_by: string | null;
  assignee_id: string | null;
  content_draft_id: string | null;
  invoice_id: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  action: TaskActivityAction;
  feedback_text: string | null;
  snapshot_content: string | null;
  actor_name: string | null;
  version: number;
  created_at: string;
}

export interface ContentDraft {
  id: string;
  type: ContentType;
  title: string;
  bullet_points: string;
  generated_body: string;
  edited_body: string | null;
  ai_model: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  file_name: string;
  file_url: string;
  file_mime_type: string;
  vendor: string | null;
  total_amount: number | null;
  currency: string | null;
  due_date: string | null;
  invoice_number: string | null;
  extracted_raw: Record<string, unknown> | null;
  ai_model: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number | null;
  unit_price: number | null;
  amount: number;
  sort_order: number;
  created_at: string;
}

export interface TaskWithRelations extends Task {
  assignee?: Profile | null;
  creator?: Profile | null;
  content_draft?: ContentDraft | null;
  invoice?: Invoice | null;
  activity?: TaskActivity[];
}

export interface DashboardStats {
  pendingTasks: number;
  recentDrafts: number;
  pendingInvoices: number;
  approvedThisWeek: number;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  draft:            "Draft",
  pending_approval: "Pending Approval",
  approved:         "Approved",
  rejected:         "Rejected",
  needs_revisions:  "Needs Revisions",
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  draft:            "bg-slate-100 text-slate-700",
  pending_approval: "bg-amber-100 text-amber-800",
  approved:         "bg-emerald-100 text-emerald-800",
  rejected:         "bg-red-100 text-red-800",
  needs_revisions:  "bg-orange-100 text-orange-800",
};
