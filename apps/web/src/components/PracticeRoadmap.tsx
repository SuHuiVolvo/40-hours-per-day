import { createPortal } from "react-dom";
import type { Dispatch, FormEvent, RefObject, SetStateAction } from "react";
import { CardCollapseButton } from "./CardCollapseButton";
import { SectionCard } from "./SectionCard";
import { TaskCard } from "./TaskCard";
import {
  type PracticeSection,
  type PracticeTask,
  type SectionForm,
  type TaskEditForm,
  type TaskForm,
} from "../lib/practice";

type PracticeRoadmapProps = {
  sections: PracticeSection[];
  selectedSectionId: string;
  setSelectedSectionId: Dispatch<SetStateAction<string>>;
  selectedSection: PracticeSection | null;
  selectedTasks: PracticeTask[];
  sectionForm: SectionForm;
  setSectionForm: Dispatch<SetStateAction<SectionForm>>;
  sectionDraft: SectionForm;
  setSectionDraft: Dispatch<SetStateAction<SectionForm>>;
  isCreateSectionOpen: boolean;
  setIsCreateSectionOpen: Dispatch<SetStateAction<boolean>>;
  isUpdateSectionOpen: boolean;
  setIsUpdateSectionOpen: Dispatch<SetStateAction<boolean>>;
  isSectionActionsOpen: boolean;
  setIsSectionActionsOpen: Dispatch<SetStateAction<boolean>>;
  isDeleteSectionConfirmOpen: boolean;
  setIsDeleteSectionConfirmOpen: Dispatch<SetStateAction<boolean>>;
  sectionError: string;
  sectionSaving: boolean;
  sectionDeleting: boolean;
  taskForm: TaskForm;
  setTaskForm: Dispatch<SetStateAction<TaskForm>>;
  taskError: string;
  taskSaving: boolean;
  isTaskCreatorOpen: boolean;
  setIsTaskCreatorOpen: Dispatch<SetStateAction<boolean>>;
  editingTaskId: string | null;
  editingTaskForm: TaskEditForm;
  setEditingTaskId: Dispatch<SetStateAction<string | null>>;
  setEditingTaskForm: Dispatch<SetStateAction<TaskEditForm>>;
  draggedSectionId: string | null;
  setDraggedSectionId: Dispatch<SetStateAction<string | null>>;
  sectionSummaryActionsRef: RefObject<HTMLDivElement | null>;
  taskCreatorRef: RefObject<HTMLFormElement | null>;
  onCreateSection: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onUpdateSection: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onReorderSections: (
    draggedId: string,
    targetId: string,
  ) => void | Promise<void>;
  onRemoveSection: () => void | Promise<void>;
  onCreateTask: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onBeginTaskEdit: (task: PracticeTask) => void;
  onSaveTaskEdit: (taskId: string) => void | Promise<void>;
  onToggleTaskCompletion: (task: PracticeTask) => void | Promise<void>;
  onRemoveTask: (taskId: string) => void | Promise<void>;
  onDuplicateTask: (task: PracticeTask) => void | Promise<void>;
  onMoveTask: (taskId: string, sectionId: string) => void | Promise<void>;
  onArchiveTask: (taskId: string) => void | Promise<void>;
};

export function PracticeRoadmap({
  sections,
  selectedSectionId,
  setSelectedSectionId,
  selectedSection,
  selectedTasks,
  sectionForm,
  setSectionForm,
  sectionDraft,
  setSectionDraft,
  isCreateSectionOpen,
  setIsCreateSectionOpen,
  isUpdateSectionOpen,
  setIsUpdateSectionOpen,
  isSectionActionsOpen,
  setIsSectionActionsOpen,
  isDeleteSectionConfirmOpen,
  setIsDeleteSectionConfirmOpen,
  sectionError,
  sectionSaving,
  sectionDeleting,
  taskForm,
  setTaskForm,
  taskError,
  taskSaving,
  isTaskCreatorOpen,
  setIsTaskCreatorOpen,
  editingTaskId,
  editingTaskForm,
  setEditingTaskId,
  setEditingTaskForm,
  draggedSectionId,
  setDraggedSectionId,
  sectionSummaryActionsRef,
  taskCreatorRef,
  onCreateSection,
  onUpdateSection,
  onReorderSections,
  onRemoveSection,
  onCreateTask,
  onBeginTaskEdit,
  onSaveTaskEdit,
  onToggleTaskCompletion,
  onRemoveTask,
  onDuplicateTask,
  onMoveTask,
  onArchiveTask,
}: PracticeRoadmapProps) {
  return (
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
          {isCreateSectionOpen ? "Hide new section form" : "Create new section"}
        </button>
      </div>

      {isCreateSectionOpen ? (
        <form
          id="section-create-form"
          className="stack section-create-form section-create-banner"
          onSubmit={onCreateSection}
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
          {sectionError ? <p className="status error">{sectionError}</p> : null}
          <button type="submit" className="primary" disabled={sectionSaving}>
            {sectionSaving ? "Saving..." : "Create section"}
          </button>
        </form>
      ) : null}

      <div className="roadmap-layout">
        <aside className="roadmap-sidebar">
          <div className="section-list">
            {sections.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                isSelected={section.id === selectedSectionId}
                isDragging={draggedSectionId === section.id}
                onSelect={setSelectedSectionId}
                onDragStart={setDraggedSectionId}
                onDragEnd={() => setDraggedSectionId(null)}
                onDropSection={(targetSectionId) => {
                  if (
                    !draggedSectionId ||
                    draggedSectionId === targetSectionId
                  ) {
                    setDraggedSectionId(null);
                    return;
                  }

                  onReorderSections(draggedSectionId, targetSectionId);
                  setDraggedSectionId(null);
                }}
              />
            ))}
          </div>
        </aside>

        <div className="roadmap-workspace">
          {selectedSection ? (
            <>
              <div className="section-summary">
                <div className="section-summary-title flex justify-between w-full">
                  <div>
                    <h3>{selectedSection.name}</h3>
                    <p>
                      {selectedSection.description ||
                        "No section description yet."}
                    </p>
                  </div>
                  <div className="summary-metrics">
                    <strong>{selectedSection.completionPercent}%</strong>
                    <small>
                      {selectedSection.completedCount}/
                      {selectedSection.taskCount} tasks
                    </small>
                  </div>
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
                        onClick={() => {
                          setIsDeleteSectionConfirmOpen(true);
                          setIsSectionActionsOpen(false);
                        }}
                      >
                        Delete session
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="section-summary-tasks h-full">
                  {taskError && !isTaskCreatorOpen && editingTaskId === null ? (
                    <p className="status error section-summary-error">
                      {taskError}
                    </p>
                  ) : null}
                  {sectionError ? (
                    <p className="status error section-summary-error">
                      {sectionError}
                    </p>
                  ) : null}
                  {!isTaskCreatorOpen &&
                  !isUpdateSectionOpen &&
                  selectedTasks.length === 0 ? (
                    <button
                      type="button"
                      className="primary section-create-toggle task-create-empty-toggle"
                      onClick={() => {
                        setIsTaskCreatorOpen(true);
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
                      }}
                    >
                      <span
                        aria-hidden="true"
                        className="task-create-empty-icon"
                      >
                        +
                      </span>
                      <span>add task</span>
                    </button>
                  ) : null}
                  {isUpdateSectionOpen ? (
                    <form
                      id="section-update-form"
                      className="stack section-editor w-full"
                      onSubmit={onUpdateSection}
                    >
                      <CardCollapseButton
                        onClick={() => setIsUpdateSectionOpen(false)}
                        ariaLabel="Hide edit session card"
                      />
                      <h4>Edit session</h4>
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
                      {sectionError ? (
                        <p className="status error">{sectionError}</p>
                      ) : null}
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
                          onClick={() => setIsUpdateSectionOpen(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : null}
                  {isTaskCreatorOpen ? (
                    <form
                      className="stack task-creator w-full"
                      onSubmit={onCreateTask}
                      ref={taskCreatorRef}
                    >
                      <CardCollapseButton
                        onClick={() => setIsTaskCreatorOpen(false)}
                        ariaLabel="Hide add task card"
                      />
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
                  {selectedTasks.length > 0 ? (
                    <div className="task-list w-full">
                      {selectedTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          sections={sections}
                          editingTaskId={editingTaskId}
                          editingTaskForm={editingTaskForm}
                          taskSaving={taskSaving}
                          taskError={taskError}
                          onBeginEdit={onBeginTaskEdit}
                          onDelete={onRemoveTask}
                          onDuplicate={onDuplicateTask}
                          onMove={onMoveTask}
                          onArchive={onArchiveTask}
                          onSaveEdit={onSaveTaskEdit}
                          onCancelEdit={() => {
                            setEditingTaskId(null);
                            setEditingTaskForm({
                              title: "",
                              details: "",
                              deadline: "",
                              isCompleted: false,
                            });
                          }}
                          onToggleCompletion={onToggleTaskCompletion}
                          onChangeEditForm={setEditingTaskForm}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              {isDeleteSectionConfirmOpen && selectedSection
                ? createPortal(
                    <div
                      className="delete-overlay"
                      role="presentation"
                      onClick={() => setIsDeleteSectionConfirmOpen(false)}
                    >
                      <div
                        className="delete-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-session-title"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <p className="eyebrow delete-dialog-eyebrow">
                          Confirm deletion
                        </p>
                        <h4 id="delete-session-title">Delete session?</h4>
                        <p className="delete-dialog-copy">
                          {selectedSection.name} and all of its tasks will be
                          permanently removed.
                        </p>
                        {sectionError ? (
                          <p className="status error">{sectionError}</p>
                        ) : null}
                        <div className="section-actions delete-dialog-actions">
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => setIsDeleteSectionConfirmOpen(false)}
                            disabled={sectionDeleting}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="primary danger-button"
                            onClick={() => {
                              void onRemoveSection();
                            }}
                            disabled={sectionDeleting}
                          >
                            {sectionDeleting ? "Deleting..." : "Delete session"}
                          </button>
                        </div>
                      </div>
                    </div>,
                    document.body,
                  )
                : null}
            </>
          ) : (
            <p className="empty-state">Create a section to start planning.</p>
          )}
        </div>
      </div>
    </section>
  );
}
