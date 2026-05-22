export type PracticeTask = {
  id: string;
  sectionId: string;
  title: string;
  details: string;
  deadline: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PracticeSection = {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  createdAt: string;
  taskCount: number;
  completedCount: number;
  completionPercent: number;
  tasks: PracticeTask[];
};

export type UploadedFile = {
  fileName: string;
  originalName: string;
  url: string;
};

export type SectionForm = {
  name: string;
  description: string;
};

export type TaskForm = {
  title: string;
  details: string;
  deadline: string;
};

export type TaskEditForm = TaskForm & {
  isCompleted: boolean;
};

export const API_BASE = "";
export const backlogSectionId = "backlog";

export const initialSectionForm: SectionForm = {
  name: "",
  description: "",
};

export const initialTaskForm: TaskForm = {
  title: "",
  details: "",
  deadline: "",
};

export const initialTaskEditForm: TaskEditForm = {
  title: "",
  details: "",
  deadline: "",
  isCompleted: false,
};

export function formatDate(value: string | null) {
  if (!value) {
    return "No deadline";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export const readErrorMessage = async (
  response: Response,
  fallback: string,
) => {
  const body = await response.text();
  if (!body) {
    return fallback;
  }

  try {
    const payload = JSON.parse(body) as { message?: string };
    return payload.message ?? fallback;
  } catch {
    return body || fallback;
  }
};
