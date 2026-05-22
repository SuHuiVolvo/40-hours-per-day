import type { Dispatch, SetStateAction } from "react";
import type { UploadedFile } from "../lib/practice";

type PracticeMediaPanelsProps = {
  noteFile: File | null;
  setNoteFile: Dispatch<SetStateAction<File | null>>;
  noteUploadStatus: string;
  lastSavedNote: UploadedFile | null;
  recordingStatus: string;
  recordingUrl: string;
  recordedBlob: Blob | null;
  lastSavedRecording: UploadedFile | null;
  isRecording: boolean;
  onUploadNote: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSaveRecording: () => void;
};

export function PracticeMediaPanels({
  noteFile,
  setNoteFile,
  noteUploadStatus,
  lastSavedNote,
  recordingStatus,
  recordingUrl,
  recordedBlob,
  lastSavedRecording,
  isRecording,
  onUploadNote,
  onStartRecording,
  onStopRecording,
  onSaveRecording,
}: PracticeMediaPanelsProps) {
  return (
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
              onChange={(event) => setNoteFile(event.target.files?.[0] ?? null)}
            />
            <span>{noteFile ? noteFile.name : "Choose a PDF score"}</span>
          </label>
          <button type="button" className="primary" onClick={onUploadNote}>
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
            onClick={onStartRecording}
            disabled={isRecording}
          >
            Start recording
          </button>
          <button
            type="button"
            className="ghost"
            onClick={onStopRecording}
            disabled={!isRecording}
          >
            Stop
          </button>
          <button
            type="button"
            className="ghost"
            onClick={onSaveRecording}
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
  );
}
