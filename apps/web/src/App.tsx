import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

type PracticeTask = {
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

type PracticeSection = {
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

type UploadedFile = {
  fileName: string;
  originalName: string;
  url: string;
};

type SectionForm = {
  name: string;
  description: string;
};

type TaskForm = {
  title: string;
  details: string;
  deadline: string;
};

type TaskEditForm = TaskForm & {
  isCompleted: boolean;
};

const API_BASE = "";
const backlogSectionId = "backlog";

const initialSectionForm: SectionForm = {
  name: "",
  description: "",
};

const initialTaskForm: TaskForm = {
  title: "",
  details: "",
  deadline: "",
};

const initialTaskEditForm: TaskEditForm = {
  title: "",
  details: "",
  deadline: "",
  isCompleted: false,
};

function formatDate(value: string | null) {
  if (!value) {
    return "No deadline";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

const readErrorMessage = async (response: Response, fallback: string) => {
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

export default function App() {
  const [sections, setSections] = useState<PracticeSection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [sectionForm, setSectionForm] = useState(initialSectionForm);
  const [sectionDraft, setSectionDraft] = useState(initialSectionForm);
  const [isCreateSectionOpen, setIsCreateSectionOpen] = useState(false);
  const [isUpdateSectionOpen, setIsUpdateSectionOpen] = useState(false);
  const [isSectionActionsOpen, setIsSectionActionsOpen] = useState(false);
  const [sectionError, setSectionError] = useState("");
  const [sectionSaving, setSectionSaving] = useState(false);
  const [taskForm, setTaskForm] = useState(initialTaskForm);
  const [taskError, setTaskError] = useState("");
  const [taskSaving, setTaskSaving] = useState(false);
  const [isTaskCreatorOpen, setIsTaskCreatorOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskForm, setEditingTaskForm] = useState(initialTaskEditForm);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
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
  const sectionSummaryActionsRef = useRef<HTMLDivElement | null>(null);
  const taskCreatorRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        sectionSummaryActionsRef.current &&
        !sectionSummaryActionsRef.current.contains(event.target as Node)
      ) {
        setIsSectionActionsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSectionActionsOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const selectedSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId) ?? null,
    [sections, selectedSectionId],
  );

  const selectedTasks = selectedSection?.tasks ?? [];
  const totalTasks = sections.reduce(
    (sum, section) => sum + section.taskCount,
    0,
  );
  const completedTasks = sections.reduce(
    (sum, section) => sum + section.completedCount,
    0,
  );
  const overallCompletion =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  useEffect(() => {
    const loadRoadmap = async () => {
      const response = await fetch(`${API_BASE}/api/roadmap`);
      if (!response.ok) {
        throw new Error("Unable to load roadmap.");
      }

      const data = (await response.json()) as PracticeSection[];
      setSections(data);
      setSelectedSectionId((current) =>
        current && data.some((section) => section.id === current)
          ? current
          : (data[0]?.id ?? ""),
      );
    };

    loadRoadmap().catch(() =>
      setSectionError("Unable to load roadmap right now."),
    );
  }, []);

  useEffect(() => {
    if (!selectedSection) {
      setSectionDraft(initialSectionForm);
      setTaskForm(initialTaskForm);
      setIsTaskCreatorOpen(false);
      setEditingTaskId(null);
      setEditingTaskForm(initialTaskEditForm);
      setIsUpdateSectionOpen(false);
      return;
    }

    setSectionDraft({
      name: selectedSection.name,
      description: selectedSection.description,
    });
    setTaskForm(initialTaskForm);
    setIsTaskCreatorOpen(false);
    setEditingTaskId(null);
    setEditingTaskForm(initialTaskEditForm);
    setIsUpdateSectionOpen(false);
  }, [
    selectedSection?.id,
    selectedSection?.name,
    selectedSection?.description,
  ]);

  const refreshRoadmap = async () => {
    setIsUpdateSectionOpen(false);
    const response = await fetch(`${API_BASE}/api/roadmap`);
    if (!response.ok) {
      throw new Error("Unable to load roadmap.");
    }

    const data = (await response.json()) as PracticeSection[];
    setSections(data);
    setSelectedSectionId((current) =>
      current && data.some((section) => section.id === current)
        ? current
        : (data[0]?.id ?? ""),
    );
  };

  const reorderSections = async (draggedId: string, targetId: string) => {
    if (draggedId === targetId) {
      return;
    }

    const draggedIndex = sections.findIndex(
      (section) => section.id === draggedId,
    );
    const targetIndex = sections.findIndex(
      (section) => section.id === targetId,
    );
    if (draggedIndex === -1 || targetIndex === -1) {
      return;
    }

    const nextSections = [...sections];
    const [movedSection] = nextSections.splice(draggedIndex, 1);
    nextSections.splice(targetIndex, 0, movedSection);

    setSections(nextSections);

    const response = await fetch(`${API_BASE}/api/sections/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectionIds: nextSections.map((section) => section.id),
      }),
    });

    if (!response.ok) {
      await refreshRoadmap();
      throw new Error(
        await readErrorMessage(response, "Unable to reorder sections."),
      );
    }

    const updatedSections = (await response.json()) as PracticeSection[];
    setSections(updatedSections);
  };

  const createSection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSectionError("");
    setSectionSaving(true);

    try {
      const response = await fetch(`${API_BASE}/api/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sectionForm),
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Unable to create section."),
        );
      }

      const created = (await response.json()) as PracticeSection;
      setSectionForm(initialSectionForm);
      setSelectedSectionId(created.id);
      setIsCreateSectionOpen(false);
      await refreshRoadmap();
    } catch (error) {
      setSectionError(
        error instanceof Error ? error.message : "Unable to create section.",
      );
    } finally {
      setSectionSaving(false);
    }
  };

  const updateSection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSection) {
      return;
    }

    setSectionError("");
    setSectionSaving(true);

    try {
      const response = await fetch(
        `${API_BASE}/api/sections/${selectedSection.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sectionDraft),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Unable to update section."),
        );
      }

      await refreshRoadmap();
    } catch (error) {
      setSectionError(
        error instanceof Error ? error.message : "Unable to update section.",
      );
    } finally {
      setSectionSaving(false);
    }
  };

  const removeSection = async () => {
    if (!selectedSection) {
      return;
    }

    const response = await fetch(
      `${API_BASE}/api/sections/${selectedSection.id}`,
      {
        method: "DELETE",
      },
    );

    if (!response.ok) {
      setSectionError(
        await readErrorMessage(response, "Unable to delete section."),
      );
      return;
    }

    await refreshRoadmap();
  };

  const createTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSection) {
      setTaskError("Create a section first.");
      return;
    }

    setTaskError("");
    setTaskSaving(true);

    try {
      const response = await fetch(`${API_BASE}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: selectedSection.id,
          ...taskForm,
          deadline: taskForm.deadline || null,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Unable to save task."),
        );
      }

      setTaskForm(initialTaskForm);
      await refreshRoadmap();
    } catch (error) {
      setTaskError(
        error instanceof Error ? error.message : "Unable to save task.",
      );
    } finally {
      setTaskSaving(false);
    }
  };

  const beginTaskEdit = (task: PracticeTask) => {
    setEditingTaskId(task.id);
    setEditingTaskForm({
      title: task.title,
      details: task.details,
      deadline: task.deadline ?? "",
      isCompleted: task.isCompleted,
    });
  };

  const saveTaskEdit = async (taskId: string) => {
    setTaskError("");
    setTaskSaving(true);

    try {
      const response = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingTaskForm,
          deadline: editingTaskForm.deadline || null,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Unable to update task."),
        );
      }

      setEditingTaskId(null);
      setEditingTaskForm(initialTaskEditForm);
      await refreshRoadmap();
    } catch (error) {
      setTaskError(
        error instanceof Error ? error.message : "Unable to update task.",
      );
    } finally {
      setTaskSaving(false);
    }
  };

  const toggleTaskCompletion = async (task: PracticeTask) => {
    await fetch(`${API_BASE}/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted: !task.isCompleted }),
    });
    await refreshRoadmap();
  };

  const removeTask = async (taskId: string) => {
    await fetch(`${API_BASE}/api/tasks/${taskId}`, { method: "DELETE" });
    await refreshRoadmap();
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
      throw new Error(
        await readErrorMessage(response, "Unable to upload PDF."),
      );
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
      throw new Error(
        await readErrorMessage(response, "Unable to save recording."),
      );
    }

    const uploaded = (await response.json()) as UploadedFile;
    setLastSavedRecording(uploaded);
    setRecordingStatus(`Saved ${uploaded.originalName}.`);
  };

  const roadmapStatus = `${sections.length} section${sections.length === 1 ? "" : "s"} · ${completedTasks}/${totalTasks} tasks complete`;

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Hoppy Practice Studio</p>
          <h1>40 Hours, No Excuses</h1>
          <p className="lede">Have You Practiced Today?</p>
        </div>
        <div className="hero-card">
          <span>{roadmapStatus}</span>
          <strong>{overallCompletion}% roadmap complete</strong>
          <small>
            {lastSavedNote ? "Latest score uploaded" : "No score uploaded yet"}
          </small>
          <small>
            {lastSavedRecording
              ? "Latest recording saved"
              : "No recording saved yet"}
          </small>
        </div>
      </section>

      <section className="panel panel-wide roadmap-panel">
        <div className="panel-header">
          <div>
            <h2>Practice roadmap</h2>
            <p className="panel-subtitle">
              Sections show finish percentage from completed tasks.
            </p>
          </div>
          <button
            type="button"
            className="primary section-create-toggle"
            onClick={() => setIsCreateSectionOpen((current) => !current)}
            aria-expanded={isCreateSectionOpen}
            aria-controls="section-create-form"
          >
            {isCreateSectionOpen
              ? "Hide new section form"
              : "Create new section"}
          </button>
        </div>

        {isCreateSectionOpen ? (
          <form
            id="section-create-form"
            className="stack section-create-form section-create-banner"
            onSubmit={createSection}
          >
            <label>
              New section name
              <input
                value={sectionForm.name}
                onChange={(event) =>
                  setSectionForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Foundation, Rehearsal, Release"
                required
              />
            </label>
            <label>
              Section description
              <textarea
                value={sectionForm.description}
                onChange={(event) =>
                  setSectionForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="What this planning stage needs to accomplish"
                rows={3}
              />
            </label>
            {sectionError ? (
              <p className="status error">{sectionError}</p>
            ) : null}
            <button type="submit" className="primary" disabled={sectionSaving}>
              {sectionSaving ? "Saving..." : "Create section"}
            </button>
          </form>
        ) : null}

        <div className="roadmap-layout">
          <aside className="roadmap-sidebar">
            <div className="section-list">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={`section-card ${
                    section.id === selectedSectionId
                      ? "section-card-active"
                      : ""
                  } ${draggedSectionId === section.id ? "section-card-dragging" : ""}`}
                  onClick={() => setSelectedSectionId(section.id)}
                  draggable
                  onDragStart={() => setDraggedSectionId(section.id)}
                  onDragEnd={() => setDraggedSectionId(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (!draggedSectionId || draggedSectionId === section.id) {
                      setDraggedSectionId(null);
                      return;
                    }

                    reorderSections(draggedSectionId, section.id).catch(() =>
                      setSectionError("Unable to reorder sections."),
                    );
                    setDraggedSectionId(null);
                  }}
                >
                  <div className="section-card-header">
                    <strong>{section.name}</strong>
                    <span>{section.completionPercent}%</span>
                  </div>
                  <p>{section.description || "No description yet."}</p>
                  <div className="progress-bar">
                    <span style={{ width: `${section.completionPercent}%` }} />
                  </div>
                  <small>
                    {section.completedCount}/{section.taskCount} tasks complete
                  </small>
                </button>
              ))}
            </div>
          </aside>

          <div className="roadmap-workspace">
            {selectedSection ? (
              <>
                <div className="section-summary">
                  <div>
                    <h3>{selectedSection.name}</h3>
                    <p>
                      {selectedSection.description ||
                        "No section description yet."}
                    </p>
                  </div>
                  <div className="summary-metrics">
                    <strong>{selectedSection.completionPercent}%</strong>
                    <span>complete</span>
                    <small>
                      {selectedSection.completedCount}/
                      {selectedSection.taskCount} tasks
                    </small>
                  </div>
                  <div
                    className="section-summary-actions"
                    ref={sectionSummaryActionsRef}
                  >
                    <button
                      type="button"
                      className="section-detail-toggle"
                      onClick={() =>
                        setIsSectionActionsOpen((current) => !current)
                      }
                      aria-expanded={isSectionActionsOpen}
                      aria-controls="section-actions-menu"
                      aria-haspopup="menu"
                    >
                      ⋮
                    </button>
                    {isSectionActionsOpen ? (
                      <div
                        id="section-actions-menu"
                        className="section-actions-menu"
                        role="menu"
                      >
                        <button
                          type="button"
                          className="section-action-item"
                          onClick={() => {
                            setIsTaskCreatorOpen((current) => !current);
                            if (!isTaskCreatorOpen) {
                              requestAnimationFrame(() => {
                                taskCreatorRef.current?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start",
                                });
                                taskCreatorRef.current
                                  ?.querySelector<HTMLInputElement>(
                                    'input[name="task-title"]',
                                  )
                                  ?.focus();
                              });
                            }
                            setIsSectionActionsOpen(false);
                          }}
                        >
                          {isTaskCreatorOpen
                            ? "Hide new task card"
                            : "Create new task"}
                        </button>
                        <button
                          type="button"
                          className="section-action-item"
                          onClick={() => {
                            setIsUpdateSectionOpen(true);
                            setIsSectionActionsOpen(false);
                          }}
                        >
                          Edit session
                        </button>
                        <button
                          type="button"
                          className="section-action-item danger"
                          onClick={async () => {
                            setIsSectionActionsOpen(false);
                            await removeSection();
                          }}
                          disabled={selectedSection.id === backlogSectionId}
                        >
                          Delete session
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                {isUpdateSectionOpen ? (
                  <form
                    id="section-update-form"
                    className="stack section-editor"
                    onSubmit={updateSection}
                  >
                    <button
                      type="button"
                      className="section-editor-collapse"
                      onClick={() => setIsUpdateSectionOpen(false)}
                      aria-label="Hide edit session card"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        focusable="false"
                        className="section-editor-collapse-icon"
                      >
                        <path
                          d="M6 14l6-6 6 6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <label>
                      Section name
                      <input
                        value={sectionDraft.name}
                        onChange={(event) =>
                          setSectionDraft((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                    <label>
                      Section description
                      <textarea
                        value={sectionDraft.description}
                        onChange={(event) =>
                          setSectionDraft((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        rows={3}
                      />
                    </label>
                    <div className="section-actions">
                      <button
                        type="submit"
                        className="primary"
                        disabled={sectionSaving}
                      >
                        {sectionSaving ? "Updating..." : "Update section"}
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() =>
                          removeSection().catch(() =>
                            setSectionError("Unable to delete section."),
                          )
                        }
                        disabled={selectedSection.id === backlogSectionId}
                      >
                        Delete section
                      </button>
                    </div>
                  </form>
                ) : null}

                {isTaskCreatorOpen ? (
                  <form
                    className="stack task-creator"
                    onSubmit={createTask}
                    ref={taskCreatorRef}
                  >
                    <button
                      type="button"
                      className="section-editor-collapse"
                      onClick={() => setIsTaskCreatorOpen(false)}
                      aria-label="Hide add task card"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        focusable="false"
                        className="section-editor-collapse-icon"
                      >
                        <path
                          d="M6 14l6-6 6 6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <h4>Add task</h4>
                    <label>
                      Task name
                      <input
                        name="task-title"
                        value={taskForm.title}
                        onChange={(event) =>
                          setTaskForm((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                        placeholder="Practice scales at 72 bpm"
                        required
                      />
                    </label>
                    <label>
                      Description
                      <textarea
                        value={taskForm.details}
                        onChange={(event) =>
                          setTaskForm((current) => ({
                            ...current,
                            details: event.target.value,
                          }))
                        }
                        placeholder="What to focus on and how to measure success"
                        rows={3}
                      />
                    </label>
                    <label>
                      Deadline
                      <input
                        type="date"
                        value={taskForm.deadline}
                        onChange={(event) =>
                          setTaskForm((current) => ({
                            ...current,
                            deadline: event.target.value,
                          }))
                        }
                      />
                    </label>
                    {taskError ? (
                      <p className="status error">{taskError}</p>
                    ) : null}
                    <button
                      type="submit"
                      className="primary"
                      disabled={taskSaving}
                    >
                      {taskSaving ? "Saving..." : "Add task"}
                    </button>
                  </form>
                ) : null}

                <div className="task-list">
                  {selectedTasks.map((task) => (
                    <article
                      key={task.id}
                      className="task-card task-card-column"
                    >
                      <div className="task-card-header">
                        <label className="task-complete-toggle">
                          <input
                            type="checkbox"
                            checked={task.isCompleted}
                            onChange={() =>
                              toggleTaskCompletion(task).catch(() =>
                                setTaskError("Unable to update task."),
                              )
                            }
                          />
                          <span>{task.isCompleted ? "Done" : "Open"}</span>
                        </label>
                        <div className="task-actions">
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => beginTaskEdit(task)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => removeTask(task.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {editingTaskId === task.id ? (
                        <div className="stack task-editor">
                          <label>
                            Task name
                            <input
                              value={editingTaskForm.title}
                              onChange={(event) =>
                                setEditingTaskForm((current) => ({
                                  ...current,
                                  title: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label>
                            Description
                            <textarea
                              value={editingTaskForm.details}
                              onChange={(event) =>
                                setEditingTaskForm((current) => ({
                                  ...current,
                                  details: event.target.value,
                                }))
                              }
                              rows={3}
                            />
                          </label>
                          <label>
                            Deadline
                            <input
                              type="date"
                              value={editingTaskForm.deadline}
                              onChange={(event) =>
                                setEditingTaskForm((current) => ({
                                  ...current,
                                  deadline: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label className="task-status-toggle">
                            <input
                              type="checkbox"
                              checked={editingTaskForm.isCompleted}
                              onChange={(event) =>
                                setEditingTaskForm((current) => ({
                                  ...current,
                                  isCompleted: event.target.checked,
                                }))
                              }
                            />
                            <span>Mark as completed</span>
                          </label>
                          <div className="section-actions">
                            <button
                              type="button"
                              className="primary"
                              disabled={taskSaving}
                              onClick={() =>
                                saveTaskEdit(task.id).catch(() =>
                                  setTaskError("Unable to update task."),
                                )
                              }
                            >
                              {taskSaving ? "Updating..." : "Save task"}
                            </button>
                            <button
                              type="button"
                              className="ghost"
                              onClick={() => {
                                setEditingTaskId(null);
                                setEditingTaskForm(initialTaskEditForm);
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="task-card-body">
                          <div>
                            <strong>{task.title}</strong>
                            <p>{task.details || "No extra details added."}</p>
                          </div>
                          <div className="task-meta">
                            <span>Deadline: {formatDate(task.deadline)}</span>
                            <span>
                              {task.isCompleted
                                ? `Completed ${formatTimestamp(task.completedAt ?? task.updatedAt)}`
                                : "Not completed"}
                            </span>
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <p className="empty-state">Create a section to start planning.</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid secondary-grid">
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

        <article className="panel panel-wide recording-panel">
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
