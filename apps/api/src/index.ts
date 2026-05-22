import cors from "cors";
import express from "express";
import multer from "multer";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import { db } from "./db.js";

interface PracticeTask {
  id: string;
  title: string;
  details: string;
  createdAt: string;
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
  "SELECT id, title, details, createdAt FROM tasks ORDER BY createdAt DESC",
);
const insertTask = db.prepare(
  "INSERT INTO tasks (id, title, details, createdAt) VALUES (?, ?, ?, ?)",
);
const deleteTask = db.prepare("DELETE FROM tasks WHERE id = ?");
const selectUploadById = db.prepare(
  "SELECT id, kind, originalName, fileName, mimeType, data, createdAt FROM uploads WHERE id = ?",
);
const insertUpload = db.prepare(
  "INSERT INTO uploads (id, kind, originalName, fileName, mimeType, data, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
);

const toPracticeTask = (row: Record<string, unknown>): PracticeTask => ({
  id: String(row.id),
  title: String(row.title),
  details: String(row.details),
  createdAt: String(row.createdAt),
});

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

app.get("/api/tasks", (_request, response) => {
  response.json(selectTasks.all().map((row) => toPracticeTask(row)));
});

app.post("/api/tasks", (request, response) => {
  const { title, details } = request.body as Partial<PracticeTask>;
  if (!title?.trim()) {
    response.status(400).json({ message: "Task title is required." });
    return;
  }

  const task: PracticeTask = {
    id: uuidv4(),
    title: title.trim(),
    details: details?.trim() ?? "",
    createdAt: new Date().toISOString(),
  };

  insertTask.run(task.id, task.title, task.details, task.createdAt);
  response.status(201).json(task);
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
