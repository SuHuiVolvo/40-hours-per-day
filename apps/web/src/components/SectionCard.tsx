import type { PracticeSection } from "../lib/practice";

type SectionCardProps = {
  section: PracticeSection;
  isSelected: boolean;
  isDragging: boolean;
  onSelect: (sectionId: string) => void;
  onDragStart: (sectionId: string) => void;
  onDragEnd: () => void;
  onDropSection: (sectionId: string) => void;
};

export function SectionCard({
  section,
  isSelected,
  isDragging,
  onSelect,
  onDragStart,
  onDragEnd,
  onDropSection,
}: SectionCardProps) {
  return (
    <button
      type="button"
      className={`section-card ${isSelected ? "section-card-active" : ""} ${isDragging ? "section-card-dragging" : ""}`}
      onClick={() => onSelect(section.id)}
      draggable
      onDragStart={() => onDragStart(section.id)}
      onDragEnd={onDragEnd}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => onDropSection(section.id)}
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
  );
}
