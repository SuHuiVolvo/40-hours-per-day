import { CardCollapseButton } from "./CardCollapseButton";
import {
  formatDate,
  formatTimestamp,
  type PracticeTask,
  type TaskEditForm,
} from "../lib/practice";

type TaskCardProps = {
  task: PracticeTask;
  editingTaskId: string | null;
  editingTaskForm: TaskEditForm;
  taskSaving: boolean;
  onBeginEdit: (task: PracticeTask) => void;
  onDelete: (taskId: string) => void;
  onSaveEdit: (taskId: string) => void;
  onCancelEdit: () => void;
  onToggleCompletion: (task: PracticeTask) => void;
  onChangeEditForm: (next: TaskEditForm) => void;
};

export function TaskCard({
  task,
  editingTaskId,
  editingTaskForm,
  taskSaving,
  onBeginEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  onToggleCompletion,
  onChangeEditForm,
}: TaskCardProps) {
  const isEditing = editingTaskId === task.id;

  return (
    <article className="task-card task-card-column">
      <div className="task-card-header">
        <label className="task-complete-toggle">
          <input
            type="checkbox"
            checked={task.isCompleted}
            onChange={() => onToggleCompletion(task)}
          />
          <span>{task.isCompleted ? "Done" : "Open"}</span>
        </label>
        <div className="task-actions">
          <button
            type="button"
            className="ghost"
            onClick={() => onBeginEdit(task)}
          >
            Edit
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => onDelete(task.id)}
          >
            Delete
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="stack task-editor">
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
          <div className="section-actions">
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
  );
}
