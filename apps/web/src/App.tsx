import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { PracticeMediaPanels } from "./components/PracticeMediaPanels";
import { PracticeRoadmap } from "./components/PracticeRoadmap";
import {
  API_BASE,
  backlogSectionId,
  initialSectionForm,
  initialTaskEditForm,
  initialTaskForm,
  readErrorMessage,
  type PracticeSection,
  type PracticeTask,
  type SectionForm,
  type TaskEditForm,
  type TaskForm,
  type UploadedFile,
} from "./lib/practice";

function App() {
  const [sections, setSections] = useState<PracticeSection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState(backlogSectionId);
  const [sectionForm, setSectionForm] =
    useState<SectionForm>(initialSectionForm);
  const [sectionDraft, setSectionDraft] =
    useState<SectionForm>(initialSectionForm);
  const [taskForm, setTaskForm] = useState<TaskForm>(initialTaskForm);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskForm, setEditingTaskForm] =
    useState<TaskEditForm>(initialTaskEditForm);
  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [noteUploadStatus, setNoteUploadStatus] = useState(
    "No score uploaded yet",
  );
  const [lastSavedNote, setLastSavedNote] = useState<UploadedFile | null>(null);
  const [recordingStatus, setRecordingStatus] = useState("Idle");
  const [recordingUrl, setRecordingUrl] = useState("");
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [lastSavedRecording, setLastSavedRecording] =
    useState<UploadedFile | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isCreateSectionOpen, setIsCreateSectionOpen] = useState(false);
  const [isUpdateSectionOpen, setIsUpdateSectionOpen] = useState(false);
  const [isTaskCreatorOpen, setIsTaskCreatorOpen] = useState(false);
  const [isSectionActionsOpen, setIsSectionActionsOpen] = useState(false);
  const [isDeleteSectionConfirmOpen, setIsDeleteSectionConfirmOpen] =
    useState(false);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [sectionSaving, setSectionSaving] = useState(false);
  const [sectionDeleting, setSectionDeleting] = useState(false);
  const [taskSaving, setTaskSaving] = useState(false);
  const [sectionError, setSectionError] = useState("");
  const [taskError, setTaskError] = useState("");
  const [roadmapStatus, setRoadmapStatus] = useState("Loading roadmap...");

  const sectionSummaryActionsRef = useRef<HTMLDivElement | null>(null);
  const taskCreatorRef = useRef<HTMLFormElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);

  const loadRoadmap = async () => {
    const response = await fetch(`${API_BASE}/api/roadmap`);
    if (!response.ok) {
      throw new Error(
        await readErrorMessage(response, "Failed to load roadmap."),
      );
    }

    const nextSections = (await response.json()) as PracticeSection[];
    setSections(nextSections);
    if (nextSections.length === 0) {
      setSelectedSectionId(backlogSectionId);
      return nextSections;
    }

    setSelectedSectionId((current) =>
      nextSections.some((section) => section.id === current)
        ? current
        : nextSections[0].id,
    );
    return nextSections;
  };

  useEffect(() => {
    loadRoadmap()
      .then((nextSections) => {
        const completeTasks = nextSections.reduce(
          (total, section) => total + section.completedCount,
          0,
        );
        const totalTasks = nextSections.reduce(
          (total, section) => total + section.taskCount,
          0,
        );
        setRoadmapStatus(
          totalTasks === 0
            ? "No tasks yet"
            : `${completeTasks}/${totalTasks} complete`,
        );
      })
      .catch((error) => {
        setRoadmapStatus(
          error instanceof Error ? error.message : "Unable to load roadmap.",
        );
      });
  }, []);

  const selectedSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId) ?? null,
    [sections, selectedSectionId],
  );

  const selectedTasks = selectedSection?.tasks ?? [];
  const overallCompletion = useMemo(() => {
    if (sections.length === 0) {
      return 0;
    }

    const completeTasks = sections.reduce(
      (total, section) => total + section.completedCount,
      0,
    );
    const totalTasks = sections.reduce(
      (total, section) => total + section.taskCount,
      0,
    );
    return totalTasks === 0
      ? 0
      : Math.round((completeTasks / totalTasks) * 100);
  }, [sections]);

  const refreshRoadmap = async () => {
    const nextSections = await loadRoadmap();
    const completeTasks = nextSections.reduce(
      (total, section) => total + section.completedCount,
      0,
    );
    const totalTasks = nextSections.reduce(
      (total, section) => total + section.taskCount,
      0,
    );
    setRoadmapStatus(
      totalTasks === 0
        ? "No tasks yet"
        : `${completeTasks}/${totalTasks} complete`,
    );
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

      setSectionForm(initialSectionForm);
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

      setIsUpdateSectionOpen(false);
      await refreshRoadmap();
    } catch (error) {
      setSectionError(
        error instanceof Error ? error.message : "Unable to update section.",
      );
    } finally {
      setSectionSaving(false);
    }
  };

  const reorderSections = async (draggedId: string, targetId: string) => {
    const nextSectionIds = sections.map((section) => section.id);
    const draggedIndex = nextSectionIds.indexOf(draggedId);
    const targetIndex = nextSectionIds.indexOf(targetId);
    if (
      draggedIndex === -1 ||
      targetIndex === -1 ||
      draggedIndex === targetIndex
    ) {
      return;
    }

    nextSectionIds.splice(draggedIndex, 1);
    nextSectionIds.splice(targetIndex, 0, draggedId);

    const response = await fetch(`${API_BASE}/api/sections/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionIds: nextSectionIds }),
    });

    if (!response.ok) {
      throw new Error(
        await readErrorMessage(response, "Unable to reorder sections."),
      );
    }

    await refreshRoadmap();
  };

  const removeSection = async () => {
    if (!selectedSection) {
      return;
    }
    setSectionError("");
    setSectionDeleting(true);

    try {
      const response = await fetch(
        `${API_BASE}/api/sections/${selectedSection.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok && response.status !== 204) {
        throw new Error(
          await readErrorMessage(response, "Unable to delete section."),
        );
      }

      setEditingTaskId(null);
      setEditingTaskForm(initialTaskEditForm);
      setIsSectionActionsOpen(false);
      setIsDeleteSectionConfirmOpen(false);
      await refreshRoadmap();
    } catch (error) {
      setSectionError(
        error instanceof Error ? error.message : "Unable to delete section.",
      );
    } finally {
      setSectionDeleting(false);
    }
  };

  const createTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSection) {
      return;
    }

    setTaskError("");
    setTaskSaving(true);

    try {
      const response = await fetch(`${API_BASE}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...taskForm, sectionId: selectedSection.id }),
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Unable to create task."),
        );
      }

      setTaskForm(initialTaskForm);
      setIsTaskCreatorOpen(false);
      await refreshRoadmap();
    } catch (error) {
      setTaskError(
        error instanceof Error ? error.message : "Unable to create task.",
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
        body: JSON.stringify(editingTaskForm),
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
    const response = await fetch(`${API_BASE}/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted: !task.isCompleted }),
    });

    if (!response.ok) {
      throw new Error(
        await readErrorMessage(response, "Unable to update task."),
      );
    }

    await refreshRoadmap();
  };

  const removeTask = async (taskId: string) => {
    const response = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
      method: "DELETE",
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(
        await readErrorMessage(response, "Unable to delete task."),
      );
    }

    if (editingTaskId === taskId) {
      setEditingTaskId(null);
      setEditingTaskForm(initialTaskEditForm);
    }

    await refreshRoadmap();
  };

  const uploadNote = async () => {
    if (!noteFile) {
      setNoteUploadStatus("Choose a PDF file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", noteFile);
    const response = await fetch(`${API_BASE}/api/uploads/pdf`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "Upload failed."));
    }

    const saved = (await response.json()) as UploadedFile;
    setLastSavedNote(saved);
    setNoteUploadStatus(`Uploaded ${saved.originalName}`);
    setNoteFile(null);
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;
    recordingChunksRef.current = [];

    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordingChunksRef.current.push(event.data);
      }
    };
    recorder.onstop = () => {
      const blob = new Blob(recordingChunksRef.current, { type: "audio/webm" });
      setRecordedBlob(blob);
      setRecordingUrl(URL.createObjectURL(blob));
      setRecordingStatus("Recording ready to save");
      setIsRecording(false);
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    };

    recorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
    setRecordingStatus("Recording...");
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
  };

  const saveRecording = async () => {
    if (!recordedBlob) {
      setRecordingStatus("Record something first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", recordedBlob, "practice-recording.webm");
    const response = await fetch(`${API_BASE}/api/uploads/recording`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "Save failed."));
    }

    const saved = (await response.json()) as UploadedFile;
    setLastSavedRecording(saved);
    setRecordingStatus(`Saved ${saved.originalName}`);
  };

  useEffect(() => {
    if (!selectedSection) {
      setSectionDraft(initialSectionForm);
      return;
    }

    setSectionDraft({
      name: selectedSection.name,
      description: selectedSection.description,
    });
  }, [selectedSection]);

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

      <PracticeRoadmap
        sections={sections}
        selectedSectionId={selectedSectionId}
        setSelectedSectionId={setSelectedSectionId}
        selectedSection={selectedSection}
        selectedTasks={selectedTasks}
        sectionForm={sectionForm}
        setSectionForm={setSectionForm}
        sectionDraft={sectionDraft}
        setSectionDraft={setSectionDraft}
        isCreateSectionOpen={isCreateSectionOpen}
        setIsCreateSectionOpen={setIsCreateSectionOpen}
        isUpdateSectionOpen={isUpdateSectionOpen}
        setIsUpdateSectionOpen={setIsUpdateSectionOpen}
        isSectionActionsOpen={isSectionActionsOpen}
        setIsSectionActionsOpen={setIsSectionActionsOpen}
        sectionError={sectionError}
        sectionSaving={sectionSaving}
        sectionDeleting={sectionDeleting}
        taskForm={taskForm}
        setTaskForm={setTaskForm}
        taskError={taskError}
        taskSaving={taskSaving}
        isTaskCreatorOpen={isTaskCreatorOpen}
        setIsTaskCreatorOpen={setIsTaskCreatorOpen}
        editingTaskId={editingTaskId}
        editingTaskForm={editingTaskForm}
        setEditingTaskId={setEditingTaskId}
        setEditingTaskForm={setEditingTaskForm}
        draggedSectionId={draggedSectionId}
        setDraggedSectionId={setDraggedSectionId}
        sectionSummaryActionsRef={sectionSummaryActionsRef}
        taskCreatorRef={taskCreatorRef}
        isDeleteSectionConfirmOpen={isDeleteSectionConfirmOpen}
        setIsDeleteSectionConfirmOpen={setIsDeleteSectionConfirmOpen}
        onCreateSection={createSection}
        onUpdateSection={updateSection}
        onReorderSections={reorderSections}
        onRemoveSection={removeSection}
        onCreateTask={createTask}
        onBeginTaskEdit={beginTaskEdit}
        onSaveTaskEdit={saveTaskEdit}
        onToggleTaskCompletion={toggleTaskCompletion}
        onRemoveTask={removeTask}
      />

      <PracticeMediaPanels
        noteFile={noteFile}
        setNoteFile={setNoteFile}
        noteUploadStatus={noteUploadStatus}
        lastSavedNote={lastSavedNote}
        recordingStatus={recordingStatus}
        recordingUrl={recordingUrl}
        recordedBlob={recordedBlob}
        lastSavedRecording={lastSavedRecording}
        isRecording={isRecording}
        onUploadNote={uploadNote}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        onSaveRecording={saveRecording}
      />
    </main>
  );
}

export default App;
