import { useEffect, useRef, useState } from "react";
import { CardCollapseButton } from "./CardCollapseButton";
import { useClickOutside } from "../hooks/useClickOutside";
import {
  formatDate,
  formatTimestamp,
  type PracticeSection,
  type PracticeTask,
  type TaskEditForm,
} from "../lib/practice";

type TaskCardProps = {
  task: PracticeTask;
  sections: PracticeSection[];
  editingTaskId: string | null;
  editingTaskForm: TaskEditForm;
  taskSaving: boolean;
  taskError: string;
  onBeginEdit: (task: PracticeTask) => void;
  onDelete: (taskId: string) => void;
  onDuplicate: (task: PracticeTask) => void;
  onMove: (taskId: string, sectionId: string) => void;
  onArchive: (taskId: string) => void;
  onSaveEdit: (taskId: string) => void;
  onCancelEdit: () => void;
  onToggleCompletion: (task: PracticeTask) => void;
  onChangeEditForm: (next: TaskEditForm) => void;
};

export function TaskCard({
  task,
  sections,
  editingTaskId,
  editingTaskForm,
  taskSaving,
  taskError,
  onBeginEdit,
  onDelete,
  onDuplicate,
  onMove,
  onArchive,
  onSaveEdit,
  onCancelEdit,
  onToggleCompletion,
  onChangeEditForm,
}: TaskCardProps) {
  const isEditing = editingTaskId === task.id;
  const [isExpanded, setIsExpanded] = useState(isEditing);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isMoveMenuOpen, setIsMoveMenuOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isEditing) {
      setIsExpanded(true);
      setIsActionMenuOpen(false);
      setIsMoveMenuOpen(false);
    }
  }, [isEditing]);

  useClickOutside(
    actionMenuRef,
    () => {
      setIsActionMenuOpen(false);
      setIsMoveMenuOpen(false);
    },
    isActionMenuOpen,
  );

  const availableSections = sections.filter(
    (section) => section.id !== task.sectionId,
  );

  const handleToggleExpanded = () => {
    if (isEditing) {
      return;
    }

    setIsExpanded((current) => !current);
    setIsActionMenuOpen(false);
    setIsMoveMenuOpen(false);
  };

  const handleBeginEdit = () => {
    setIsExpanded(true);
    setIsActionMenuOpen(false);
    setIsMoveMenuOpen(false);
    onBeginEdit(task);
  };

  const handleAction = (handler: () => void) => {
    handler();
    setIsActionMenuOpen(false);
    setIsMoveMenuOpen(false);
  };

  return (
    <article
      className={`task-card task-card-column ${
        isEditing || isExpanded ? "task-card-expanded" : "task-card-collapsed"
      }`}
    >
      <div className="task-card-header">
        <div className="flex gap-2">
          <label className="task-complete-toggle">
            <input
              type="checkbox"
              checked={task.isCompleted}
              onChange={() => onToggleCompletion(task)}
              disabled={taskSaving}
            />
          </label>
          <strong>{task.title}</strong>
        </div>

        <div className="task-card-actions" ref={actionMenuRef}>
          <button
            type="button"
            className="section-detail-toggle task-card-action-toggle"
            onClick={() => {
              setIsActionMenuOpen((current) => !current);
              setIsMoveMenuOpen(false);
            }}
            aria-expanded={isActionMenuOpen}
            aria-controls={`task-actions-${task.id}`}
            disabled={taskSaving}
          >
            ⋮
          </button>

          {isActionMenuOpen ? (
            <div
              id={`task-actions-${task.id}`}
              className="task-action-menu"
              role="menu"
            >
              <button
                type="button"
                className="task-action-item"
                onClick={() => handleAction(() => handleBeginEdit())}
                disabled={taskSaving}
              >
                Edit task
              </button>
              <button
                type="button"
                className="task-action-item"
                onClick={() => handleAction(() => onDuplicate(task))}
                disabled={taskSaving}
              >
                Duplicate task
              </button>
              <button
                type="button"
                className="task-action-item"
                onClick={() => setIsMoveMenuOpen((current) => !current)}
                disabled={taskSaving || availableSections.length === 0}
              >
                Move to session
              </button>
              {isMoveMenuOpen ? (
                <div
                  className="task-action-submenu"
                  role="group"
                  aria-label="Move task to session"
                >
                  {availableSections.length > 0 ? (
                    availableSections.map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        className="task-action-item task-action-subitem"
                        onClick={() =>
                          handleAction(() => onMove(task.id, section.id))
                        }
                        disabled={taskSaving}
                      >
                        {section.name}
                      </button>
                    ))
                  ) : (
                    <p className="task-action-empty">
                      No other sessions available.
                    </p>
                  )}
                </div>
              ) : null}
              <button
                type="button"
                className="task-action-item"
                onClick={() => handleAction(() => onArchive(task.id))}
                disabled={taskSaving}
              >
                Archive task
              </button>
              <button
                type="button"
                className="task-action-item danger"
                onClick={() => handleAction(() => onDelete(task.id))}
                disabled={taskSaving}
              >
                Delete task
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {isEditing ? (
        <div className="stack task-editor w-full">
          <CardCollapseButton
            onClick={onCancelEdit}
            ariaLabel="Hide edit task card"
          />
          <h4>Edit task</h4>
          <label>
            Task name
            <input
              value={editingTaskForm.title}
              onChange={(event) =>
                onChangeEditForm({
                  ...editingTaskForm,
                  title: event.target.value,
                })
              }
            />
          </label>
          <label>
            Description
            <textarea
              value={editingTaskForm.details}
              onChange={(event) =>
                onChangeEditForm({
                  ...editingTaskForm,
                  details: event.target.value,
                })
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
                onChangeEditForm({
                  ...editingTaskForm,
                  deadline: event.target.value,
                })
              }
            />
          </label>
          <label className="task-status-toggle">
            <input
              type="checkbox"
              checked={editingTaskForm.isCompleted}
              onChange={(event) =>
                onChangeEditForm({
                  ...editingTaskForm,
                  isCompleted: event.target.checked,
                })
              }
            />
            <span>Mark as completed</span>
          </label>
          {taskError ? <p className="status error">{taskError}</p> : null}
          <div className="section-actions task-editor-actions">
            <button
              type="button"
              className="primary"
              disabled={taskSaving}
              onClick={() => onSaveEdit(task.id)}
            >
              {taskSaving ? "Updating..." : "Save task"}
            </button>
            <button type="button" className="ghost" onClick={onCancelEdit}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="task-card-body">
          <div>
            <p>{task.details || "No extra details added."}</p>
          </div>
          <div className="task-meta">
            <span>Deadline: {formatDate(task.deadline)}</span>
          </div>
        </div>
      )}
    </article>
  );
}
