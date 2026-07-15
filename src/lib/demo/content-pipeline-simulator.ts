import {
  MANAGER_APPROVAL_MESSAGE,
  MANAGER_APPROVAL_SENDER,
} from "@/lib/demo/generate-mock-draft";

export const PIPELINE_FEEDBACK_DELAY_MS = 3000;

export const PIPELINE_MANAGER_DELAY_MS = 2000;

export const PIPELINE_REVIEWER_FEEDBACK =
  "Excellent draft! Let's optimize the executive quote to highlight the UFC500's compatibility with heavy-duty vehicles.";

export const PIPELINE_FINAL_NOTIFICATION = {
  sender: MANAGER_APPROVAL_SENDER,
  message: MANAGER_APPROVAL_MESSAGE,
};

export type PipelineAssigneeId = "bilyana" | "fidan" | "andrea" | "denise";

export type PipelineStepStatus =
  | "pending"
  | "processing"
  | "feedback_provided"
  | "approved"
  | "pending_final";

export type PipelineRunStatus = "idle" | "dispatched" | "processing" | "active" | "completed";

export interface PipelineAssignee {
  id: PipelineAssigneeId;
  name: string;
  role: string;
  roleTag: string;
}

export const SOCIAL_PIPELINE_REVIEWER_FEEDBACK =
  "Great tone, but let's make the hashtags slightly more corporate on LinkedIn and make sure to explicitly tag Delta Electronics EMEA!";

export const PIPELINE_ASSIGNEES: PipelineAssignee[] = [
  {
    id: "bilyana",
    name: "Bilyana Mihova",
    role: "Feedback / Reviewer",
    roleTag: "[Feedback Role]",
  },
  {
    id: "fidan",
    name: "Fidan Musazade",
    role: "Final Approval / Manager",
    roleTag: "[Approval Role]",
  },
  {
    id: "andrea",
    name: "Andrea",
    role: "Feedback / Reviewer",
    roleTag: "[Feedback Role]",
  },
  {
    id: "denise",
    name: "Denise Futterer",
    role: "Final Approval / Manager",
    roleTag: "[Approval Role]",
  },
];

export function getPipelineAssignee(id: PipelineAssigneeId): PipelineAssignee {
  return PIPELINE_ASSIGNEES.find((person) => person.id === id) ?? PIPELINE_ASSIGNEES[0];
}

export function getDefaultAssigneesForTaskType(
  type: "Press Release" | "Social Media Post"
): { reviewerId: PipelineAssigneeId; managerId: PipelineAssigneeId } {
  if (type === "Social Media Post") {
    return { reviewerId: "andrea", managerId: "denise" };
  }
  return { reviewerId: "bilyana", managerId: "fidan" };
}

export function getAssigneesForTaskType(
  type: "Press Release" | "Social Media Post"
): PipelineAssignee[] {
  const { reviewerId, managerId } = getDefaultAssigneesForTaskType(type);
  return PIPELINE_ASSIGNEES.filter(
    (person) => person.id === reviewerId || person.id === managerId
  );
}

export function pipelineStatusLabel(status: PipelineStepStatus): string {
  switch (status) {
    case "pending":
      return "⏳ Pending";
    case "processing":
      return "⏳ Processing…";
    case "feedback_provided":
      return "💬 Feedback Provided";
    case "approved":
      return "✅ Approved";
    case "pending_final":
      return "⏳ Pending Final Sign-Off";
    default:
      return "⏳ Pending";
  }
}
