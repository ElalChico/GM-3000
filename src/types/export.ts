export type ExportType = "pgn" | "txt" | "mp3" | "zip";

export interface ExportOptions {
  includePGN: boolean;
  includeAnalysis: boolean;
  includeVoice: boolean;
}

export interface ExportResult {
  saved: boolean;
  path?: string;
  error?: string;
}

export interface ExitConfirmState {
  show: boolean;
  hasUnsavedData: boolean;
  onConfirm: (() => void) | null;
  onCancel: (() => void) | null;
}

export const DEFAULT_EXIT_CONFIRM_STATE: ExitConfirmState = {
  show: false,
  hasUnsavedData: false,
  onConfirm: null,
  onCancel: null,
};
