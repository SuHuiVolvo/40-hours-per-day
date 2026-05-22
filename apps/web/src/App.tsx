import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

type PracticeTask = {
  id: string;
  title: string;
  details: string;
  createdAt: string;
};

type UploadedFile = {
  fileName: string;
  originalName: string;
  url: string;
};

const API_BASE = "";

const initialTaskForm = {
  title: "",
  details: "",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function App() {
  const [tasks, setTasks] = useState<PracticeTask[]>([]);
  const [taskForm, setTaskForm] = useState(initialTaskForm);
  const [taskError, setTaskError] = useState("");
  const [taskSaving, setTaskSaving] = useState(false);
  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [noteUploadStatus, setNoteUploadStatus] = useState("");
  const [recordingStatus, setRecordingStatus] = useState("Idle");
  const [recordingUrl, setRecordingUrl] = useState("");
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [lastSavedRecording, setLastSavedRecording] =
    useState<UploadedFile | null>(null);
  const [lastSavedNote, setLastSavedNote] = useState<UploadedFile | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  const taskCountText = useMemo(
    () => `${tasks.length} planned session${tasks.length === 1 ? "" : "s"}`,
    [tasks.length],
  );

  useEffect(() => {
    const loadTasks = async () => {
      const response = await fetch(`${API_BASE}/api/tasks`);
      const data = (await response.json()) as PracticeTask[];
      setTasks(data);
    };

    loadTasks().catch(() => setTaskError("Unable to load tasks right now."));
  }, []);

  const createTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTaskError("");
    setTaskSaving(true);

    try {
      const response = await fetch(`${API_BASE}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskForm),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Unable to save task.");
      }

      const created = (await response.json()) as PracticeTask;
      setTasks((current) => [created, ...current]);
      setTaskForm(initialTaskForm);
    } catch (error) {
      setTaskError(
        error instanceof Error ? error.message : "Unable to save task.",
      );
    } finally {
      setTaskSaving(false);
    }
  };

  const removeTask = async (taskId: string) => {
    await fetch(`${API_BASE}/api/tasks/${taskId}`, { method: "DELETE" });
    setTasks((current) => current.filter((task) => task.id !== taskId));
  };

  const uploadNote = async () => {
    if (!noteFile) {
      setNoteUploadStatus("Choose a PDF first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", noteFile);

    const response = await fetch(`${API_BASE}/api/uploads/pdf`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      throw new Error(payload.message ?? "Unable to upload PDF.");
    }

    const uploaded = (await response.json()) as UploadedFile;
    setLastSavedNote(uploaded);
    setNoteUploadStatus(`Uploaded ${uploaded.originalName}.`);
    setNoteFile(null);
  };

  const startRecording = async () => {
    setRecordingStatus("Requesting microphone access...");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    audioChunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, {
        type: recorder.mimeType || "audio/webm",
      });
      const blobUrl = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordingUrl(blobUrl);
      setRecordingStatus("Recording ready to save.");
      stream.getTracks().forEach((track) => track.stop());
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setRecordingStatus("Recording live...");
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  };

  const saveRecording = async () => {
    if (!recordedBlob) {
      setRecordingStatus("Record something first.");
      return;
    }

    const extension = recordedBlob.type.includes("webm") ? "webm" : "dat";
    const file = new File([recordedBlob], `practice-recording.${extension}`, {
      type: recordedBlob.type || "audio/webm",
    });
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE}/api/uploads/recording`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      throw new Error(payload.message ?? "Unable to save recording.");
    }

    const uploaded = (await response.json()) as UploadedFile;
    setLastSavedRecording(uploaded);
    setRecordingStatus(`Saved ${uploaded.originalName}.`);
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Hoppy Practice Studio</p>
          <h1>Have You Practiced Today?</h1>
          <p className="lede">40 Hours, No Excuses</p>
        </div>
        <div className="hero-card">
          <span>{taskCountText}</span>
          <strong>
            {lastSavedNote ? "Latest score uploaded" : "No score uploaded yet"}
          </strong>
          <small>
            {lastSavedRecording
              ? "Latest recording saved"
              : "No recording saved yet"}
          </small>
        </div>
      </section>

      <section className="grid">
        <article className="panel">
          <div className="panel-header">
            <h2>Daily practice tasks</h2>
            <span>{tasks.length} items</span>
          </div>

          <form className="stack" onSubmit={createTask}>
            <label>
              Task title
              <input
                value={taskForm.title}
                onChange={(event) =>
                  setTaskForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Warm up scales"
                required
              />
            </label>
            <label>
              Details
              <textarea
                value={taskForm.details}
                onChange={(event) =>
                  setTaskForm((current) => ({
                    ...current,
                    details: event.target.value,
                  }))
                }
                placeholder="Tempo, key, and repetition goals"
                rows={4}
              />
            </label>
            {taskError ? <p className="status error">{taskError}</p> : null}
            <button type="submit" className="primary" disabled={taskSaving}>
              {taskSaving ? "Saving..." : "Add practice task"}
            </button>
          </form>

          <ul className="task-list">
            {tasks.map((task) => (
              <li key={task.id} className="task-card">
                <div>
                  <strong>{task.title}</strong>
                  <p>{task.details || "No extra details added."}</p>
                  <small>{formatDate(task.createdAt)}</small>
                </div>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => removeTask(task.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Upload music notes</h2>
            <span>PDF only</span>
          </div>

          <div className="stack">
            <label className="file-picker">
              <input
                type="file"
                accept="application/pdf"
                onChange={(event) =>
                  setNoteFile(event.target.files?.[0] ?? null)
                }
              />
              <span>{noteFile ? noteFile.name : "Choose a PDF score"}</span>
            </label>
            <button
              type="button"
              className="primary"
              onClick={() =>
                uploadNote().catch((error) =>
                  setNoteUploadStatus(
                    error instanceof Error ? error.message : "Upload failed.",
                  ),
                )
              }
            >
              Upload score
            </button>
            <p className="status">{noteUploadStatus}</p>
            {lastSavedNote ? (
              <a
                className="file-link"
                href={lastSavedNote.url}
                target="_blank"
                rel="noreferrer"
              >
                Open {lastSavedNote.originalName}
              </a>
            ) : null}
          </div>
        </article>

        <article className="panel panel-wide">
          <div className="panel-header">
            <h2>Sound recording</h2>
            <span>{recordingStatus}</span>
          </div>

          <div className="controls">
            <button
              type="button"
              className="primary"
              onClick={() =>
                startRecording().catch((error) =>
                  setRecordingStatus(
                    error instanceof Error
                      ? error.message
                      : "Microphone access failed.",
                  ),
                )
              }
              disabled={isRecording}
            >
              Start recording
            </button>
            <button
              type="button"
              className="ghost"
              onClick={stopRecording}
              disabled={!isRecording}
            >
              Stop
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() =>
                saveRecording().catch((error) =>
                  setRecordingStatus(
                    error instanceof Error ? error.message : "Save failed.",
                  ),
                )
              }
              disabled={!recordedBlob}
            >
              Save recording
            </button>
          </div>

          {recordingUrl ? (
            <audio controls src={recordingUrl} className="audio-player" />
          ) : null}
          {lastSavedRecording ? (
            <a
              className="file-link"
              href={lastSavedRecording.url}
              target="_blank"
              rel="noreferrer"
            >
              Open {lastSavedRecording.originalName}
            </a>
          ) : null}
        </article>
      </section>
    </main>
  );
}
