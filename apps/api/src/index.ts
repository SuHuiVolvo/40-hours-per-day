import cors from "cors";
import express from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v4 as uuidv4 } from "uuid";

interface PracticeTask {
  id: string;
  title: string;
  details: string;
  createdAt: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const uploadsDir = path.join(rootDir, "uploads");
const notesDir = path.join(uploadsDir, "notes");
const recordingsDir = path.join(uploadsDir, "recordings");
const tasksFile = path.join(dataDir, "tasks.json");

for (const directory of [dataDir, uploadsDir, notesDir, recordingsDir]) {
  fs.mkdirSync(directory, { recursive: true });
}

const readTasks = (): PracticeTask[] => {
  try {
    const raw = fs.readFileSync(tasksFile, "utf8");
    const parsed = JSON.parse(raw) as PracticeTask[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeTasks = (tasks: PracticeTask[]) => {
  fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (_request, file, callback) => {
      const isAudio = file.mimetype.startsWith("audio/");
      callback(null, isAudio ? recordingsDir : notesDir);
    },
    filename: (_request, file, callback) => {
      const extension = path.extname(file.originalname) || "";
      callback(null, `${uuidv4()}${extension}`);
    },
  }),
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
app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.get("/api/tasks", (_request, response) => {
  response.json(readTasks());
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

  const tasks = readTasks();
  tasks.unshift(task);
  writeTasks(tasks);
  response.status(201).json(task);
});

app.delete("/api/tasks/:id", (request, response) => {
  const tasks = readTasks();
  const filtered = tasks.filter((task) => task.id !== request.params.id);
  if (filtered.length === tasks.length) {
    response.status(404).json({ message: "Task not found." });
    return;
  }

  writeTasks(filtered);
  response.status(204).send();
});

app.post("/api/uploads/pdf", upload.single("file"), (request, response) => {
  if (!request.file) {
    response.status(400).json({ message: "A PDF file is required." });
    return;
  }

  response.status(201).json({
    fileName: request.file.filename,
    originalName: request.file.originalname,
    url: `/uploads/notes/${request.file.filename}`,
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

    response.status(201).json({
      fileName: request.file.filename,
      originalName: request.file.originalname,
      url: `/uploads/recordings/${request.file.filename}`,
    });
  },
);

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
