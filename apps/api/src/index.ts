import cors from "cors";
import express from "express";
import multer from "multer";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import { db } from "./db.js";

interface PracticeTask {
  id: string;
  sectionId: string;
  title: string;
  details: string;
  deadline: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PracticeSection {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  createdAt: string;
  taskCount: number;
  completedCount: number;
  completionPercent: number;
  tasks: PracticeTask[];
}

interface UploadRecord {
  id: string;
  kind: "pdf" | "recording";
  originalName: string;
  fileName: string;
  mimeType: string;
  data: Buffer;
  createdAt: string;
}

const selectTasks = db.prepare(
  `
    SELECT id, sectionId, title, details, deadline, isCompleted, completedAt, createdAt, updatedAt
    FROM tasks
    ORDER BY isCompleted ASC, CASE WHEN deadline = '' THEN 1 ELSE 0 END, deadline ASC, createdAt DESC
  `,
);
const selectTaskById = db.prepare(
  "SELECT id, sectionId, title, details, deadline, isCompleted, completedAt, createdAt, updatedAt FROM tasks WHERE id = ?",
);
const insertTask = db.prepare(
  `
    INSERT INTO tasks (id, sectionId, title, details, deadline, isCompleted, completedAt, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
);
const updateTask = db.prepare(
  `
    UPDATE tasks
    SET sectionId = ?, title = ?, details = ?, deadline = ?, isCompleted = ?, completedAt = ?, updatedAt = ?
    WHERE id = ?
  `,
);
const deleteTask = db.prepare("DELETE FROM tasks WHERE id = ?");
const selectSections = db.prepare(
  "SELECT id, name, description, sortOrder, createdAt FROM sections ORDER BY sortOrder ASC, createdAt ASC",
);
const selectSectionById = db.prepare(
  "SELECT id, name, description, sortOrder, createdAt FROM sections WHERE id = ?",
);
const insertSection = db.prepare(
  "INSERT INTO sections (id, name, description, sortOrder, createdAt) VALUES (?, ?, ?, ?, ?)",
);
const updateSection = db.prepare(
  "UPDATE sections SET name = ?, description = ? WHERE id = ?",
);
const updateSectionOrder = db.prepare(
  "UPDATE sections SET sortOrder = ? WHERE id = ?",
);
const deleteSection = db.prepare("DELETE FROM sections WHERE id = ?");
const selectUploadById = db.prepare(
  "SELECT id, kind, originalName, fileName, mimeType, data, createdAt FROM uploads WHERE id = ?",
);
const insertUpload = db.prepare(
  "INSERT INTO uploads (id, kind, originalName, fileName, mimeType, data, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
);

const toBoolean = (value: unknown) =>
  value === 1 || value === true || value === "1";

const toPracticeTask = (row: Record<string, unknown>): PracticeTask => ({
  id: String(row.id),
  sectionId: String(row.sectionId),
  title: String(row.title),
  details: String(row.details),
  deadline: String(row.deadline || "") || null,
  isCompleted: toBoolean(row.isCompleted),
  completedAt: String(row.completedAt || "") || null,
  createdAt: String(row.createdAt),
  updatedAt: String(row.updatedAt || row.createdAt),
});

const toPracticeSection = (
  row: Record<string, unknown>,
): Omit<
  PracticeSection,
  "taskCount" | "completedCount" | "completionPercent" | "tasks"
> => ({
  id: String(row.id),
  name: String(row.name),
  description: String(row.description || ""),
  sortOrder: Number(row.sortOrder ?? 0),
  createdAt: String(row.createdAt),
});

const getRoadmapSections = (): PracticeSection[] => {
  const sections = (selectSections.all() as Array<Record<string, unknown>>).map(
    (row) => toPracticeSection(row),
  );
  const tasks = (selectTasks.all() as Array<Record<string, unknown>>).map(
    (row) => toPracticeTask(row),
  );

  const tasksBySection = new Map<string, PracticeTask[]>();
  for (const task of tasks) {
    const existing = tasksBySection.get(task.sectionId) ?? [];
    existing.push(task);
    tasksBySection.set(task.sectionId, existing);
  }

  return sections.map((section) => {
    const sectionTasks = tasksBySection.get(section.id) ?? [];
    const completedCount = sectionTasks.filter(
      (task) => task.isCompleted,
    ).length;
    const taskCount = sectionTasks.length;
    const completionPercent =
      taskCount === 0 ? 0 : Math.round((completedCount / taskCount) * 100);

    return {
      ...section,
      taskCount,
      completedCount,
      completionPercent,
      tasks: sectionTasks,
    };
  });
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_request, file, callback) => {
    const allowed =
      file.mimetype === "application/pdf" || file.mimetype.startsWith("audio/");
    if (!allowed) {
      callback(new Error("Only PDF and audio files are allowed."));
      return;
    }

    callback(null, true);
  },
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.get("/api/roadmap", (_request, response) => {
  response.json(getRoadmapSections());
});

app.get("/api/sections", (_request, response) => {
  response.json(getRoadmapSections());
});

app.post("/api/sections", (request, response) => {
  const { name, description } = request.body as Partial<PracticeSection>;
  if (!name?.trim()) {
    response.status(400).json({ message: "Section name is required." });
    return;
  }

  const nextSortOrder =
    (
      db
        .prepare(
          "SELECT COALESCE(MAX(sortOrder), -1) + 1 AS nextSortOrder FROM sections",
        )
        .get() as Record<string, unknown>
    ).nextSortOrder ?? 0;

  const section = {
    id: uuidv4(),
    name: name.trim(),
    description: description?.trim() ?? "",
    sortOrder: Number(nextSortOrder),
    createdAt: new Date().toISOString(),
  };

  insertSection.run(
    section.id,
    section.name,
    section.description,
    section.sortOrder,
    section.createdAt,
  );
  response.status(201).json(section);
});

app.patch("/api/sections/:id", (request, response) => {
  const existing = selectSectionById.get(request.params.id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    response.status(404).json({ message: "Section not found." });
    return;
  }

  const { name, description } = request.body as Partial<PracticeSection>;
  const nextName = name?.trim();
  if (!nextName) {
    response.status(400).json({ message: "Section name is required." });
    return;
  }

  const nextDescription = description?.trim() ?? "";
  updateSection.run(nextName, nextDescription, request.params.id);
  response.json({
    id: String(existing.id),
    name: nextName,
    description: nextDescription,
    sortOrder: Number(existing.sortOrder ?? 0),
    createdAt: String(existing.createdAt),
  });
});

app.patch("/api/sections/reorder", (request, response) => {
  const { sectionIds } = request.body as { sectionIds?: string[] };
  if (!Array.isArray(sectionIds) || sectionIds.length === 0) {
    response.status(400).json({ message: "Section order is required." });
    return;
  }

  const existingSections = selectSections.all() as Array<
    Record<string, unknown>
  >;
  const existingIds = new Set(
    existingSections.map((section) => String(section.id)),
  );
  const incomingIds = new Set(sectionIds);

  if (
    incomingIds.size !== existingIds.size ||
    [...incomingIds].some((id) => !existingIds.has(id))
  ) {
    response
      .status(400)
      .json({ message: "Section order does not match the existing sections." });
    return;
  }

  db.exec("BEGIN IMMEDIATE");
  try {
    sectionIds.forEach((sectionId, index) => {
      updateSectionOrder.run(index, sectionId);
    });
    db.exec("COMMIT");
    response.json(getRoadmapSections());
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
});

app.delete("/api/sections/:id", (request, response) => {
  if (request.params.id === "backlog") {
    response
      .status(400)
      .json({ message: "The backlog section cannot be deleted." });
    return;
  }

  const result = deleteSection.run(request.params.id);
  if (result.changes === 0) {
    response.status(404).json({ message: "Section not found." });
    return;
  }

  response.status(204).send();
});

app.get("/api/tasks", (_request, response) => {
  response.json(selectTasks.all().map((row) => toPracticeTask(row)));
});

app.post("/api/tasks", (request, response) => {
  const { sectionId, title, details, deadline } =
    request.body as Partial<PracticeTask>;
  const selectedSectionId = sectionId?.trim();
  if (!selectedSectionId) {
    response.status(400).json({ message: "A section is required." });
    return;
  }

  const section = selectSectionById.get(selectedSectionId) as
    | Record<string, unknown>
    | undefined;
  if (!section) {
    response.status(404).json({ message: "Section not found." });
    return;
  }

  if (!title?.trim()) {
    response.status(400).json({ message: "Task title is required." });
    return;
  }

  const now = new Date().toISOString();
  const task: PracticeTask = {
    id: uuidv4(),
    sectionId: selectedSectionId,
    title: title.trim(),
    details: details?.trim() ?? "",
    deadline: deadline?.trim() ? deadline.trim() : null,
    isCompleted: false,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  insertTask.run(
    task.id,
    task.sectionId,
    task.title,
    task.details,
    task.deadline ?? "",
    0,
    null,
    task.createdAt,
    task.updatedAt,
  );
  response.status(201).json(task);
});

app.patch("/api/tasks/:id", (request, response) => {
  const existing = selectTaskById.get(request.params.id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    response.status(404).json({ message: "Task not found." });
    return;
  }

  const currentTask = toPracticeTask(existing);
  const payload = request.body as Partial<PracticeTask>;
  const nextSectionId = payload.sectionId?.trim() || currentTask.sectionId;
  const nextSection = selectSectionById.get(nextSectionId) as
    | Record<string, unknown>
    | undefined;
  if (!nextSection) {
    response.status(404).json({ message: "Section not found." });
    return;
  }

  const nextTitle = payload.title?.trim() || currentTask.title;
  const nextDetails = payload.details?.trim() ?? currentTask.details;
  const nextDeadline =
    payload.deadline === undefined
      ? currentTask.deadline
      : payload.deadline?.trim() || null;
  const nextCompleted = payload.isCompleted ?? currentTask.isCompleted;
  const nextCompletedAt = nextCompleted
    ? (currentTask.completedAt ?? new Date().toISOString())
    : null;
  const updatedAt = new Date().toISOString();

  updateTask.run(
    nextSectionId,
    nextTitle,
    nextDetails,
    nextDeadline ?? "",
    nextCompleted ? 1 : 0,
    nextCompletedAt,
    updatedAt,
    currentTask.id,
  );

  response.json({
    ...currentTask,
    sectionId: nextSectionId,
    title: nextTitle,
    details: nextDetails,
    deadline: nextDeadline,
    isCompleted: nextCompleted,
    completedAt: nextCompletedAt,
    updatedAt,
  });
});

app.delete("/api/tasks/:id", (request, response) => {
  const result = deleteTask.run(request.params.id);
  if (result.changes === 0) {
    response.status(404).json({ message: "Task not found." });
    return;
  }

  response.status(204).send();
});

app.post("/api/uploads/pdf", upload.single("file"), (request, response) => {
  if (!request.file) {
    response.status(400).json({ message: "A PDF file is required." });
    return;
  }

  const uploadId = uuidv4();
  const fileName = `${uploadId}${path.extname(request.file.originalname) || ".pdf"}`;
  const createdAt = new Date().toISOString();
  insertUpload.run(
    uploadId,
    "pdf",
    request.file.originalname,
    fileName,
    request.file.mimetype,
    request.file.buffer,
    createdAt,
  );

  response.status(201).json({
    id: uploadId,
    fileName,
    originalName: request.file.originalname,
    url: `/api/uploads/${uploadId}`,
  });
});

app.post(
  "/api/uploads/recording",
  upload.single("file"),
  (request, response) => {
    if (!request.file) {
      response.status(400).json({ message: "An audio file is required." });
      return;
    }

    const uploadId = uuidv4();
    const fileName = `${uploadId}${path.extname(request.file.originalname) || ".webm"}`;
    const createdAt = new Date().toISOString();
    insertUpload.run(
      uploadId,
      "recording",
      request.file.originalname,
      fileName,
      request.file.mimetype,
      request.file.buffer,
      createdAt,
    );

    response.status(201).json({
      id: uploadId,
      fileName,
      originalName: request.file.originalname,
      url: `/api/uploads/${uploadId}`,
    });
  },
);

app.get("/api/uploads/:id", (request, response) => {
  const upload = selectUploadById.get(request.params.id) as
    | UploadRecord
    | undefined;
  if (!upload) {
    response.status(404).json({ message: "Upload not found." });
    return;
  }

  response.setHeader("Content-Type", upload.mimeType);
  response.setHeader(
    "Content-Disposition",
    `inline; filename="${upload.originalName.replaceAll('"', "")}"`,
  );
  response.send(upload.data);
});

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    response.status(400).json({ message });
  },
);

const port = Number.parseInt(process.env.PORT ?? "3001", 10);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
