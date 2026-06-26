import { useState } from "react";

interface ExitConfirmModalProps {
  show: boolean;
  hasUnsavedData: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onSavePGN?: () => void;
  onSaveAnalysis?: () => void;
  onSaveVoice?: () => void;
  onSaveAll?: () => void;
}

export function ExitConfirmModal({
  show,
  hasUnsavedData,
  onConfirm,
  onCancel,
  onSavePGN,
  onSaveAnalysis,
  onSaveVoice,
  onSaveAll,
}: ExitConfirmModalProps) {
  const [selectedOptions, setSelectedOptions] = useState({
    pgn: true,
    analysis: false,
    voice: false,
  });

  if (!show) return null;

  const handleDownload = (action?: () => void) => {
    if (action) action();
    onConfirm();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        animation: "fadeIn 0.2s ease",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #1e1e2e, #2d2d3f)",
          border: "1px solid #45475a",
          borderRadius: "16px",
          padding: "24px",
          width: "min(90vw, 440px)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ color: "#cdd6f4", fontSize: "16px", marginBottom: "16px" }}>
          {hasUnsavedData ? "Datos sin guardar detectados" : "Salir de GM-3000"}
        </h3>

        {hasUnsavedData && (
          <>
            <p style={{ color: "#a6adc8", fontSize: "13px", marginBottom: "16px", lineHeight: "1.5" }}>
              Tienes análisis de IA, voz o historial sin descargar.
              <br />
              ¿Qué deseas guardar antes de salir?
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "#cdd6f4", fontSize: "13px" }}>
                <input
                  type="checkbox"
                  checked={selectedOptions.pgn}
                  onChange={(e) => setSelectedOptions({ ...selectedOptions, pgn: e.target.checked })}
                  style={{ width: "16px", height: "16px" }}
                />
                Historial PGN
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "#cdd6f4", fontSize: "13px" }}>
                <input
                  type="checkbox"
                  checked={selectedOptions.analysis}
                  onChange={(e) => setSelectedOptions({ ...selectedOptions, analysis: e.target.checked })}
                  style={{ width: "16px", height: "16px" }}
                />
                Análisis IA (texto)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "#cdd6f4", fontSize: "13px" }}>
                <input
                  type="checkbox"
                  checked={selectedOptions.voice}
                  onChange={(e) => setSelectedOptions({ ...selectedOptions, voice: e.target.checked })}
                  style={{ width: "16px", height: "16px" }}
                />
                Voz (audio MP3)
              </label>
            </div>
          </>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {hasUnsavedData && selectedOptions.pgn && selectedOptions.analysis && selectedOptions.voice && onSaveAll && (
            <button
              onClick={() => handleDownload(onSaveAll)}
              style={{
                width: "100%",
                padding: "10px",
                background: "linear-gradient(135deg, #89b4fa, #74c7ec)",
                color: "#1e1e2e",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Descargar todo (PGN + Análisis + Voz)
            </button>
          )}

          {hasUnsavedData && selectedOptions.pgn && selectedOptions.analysis && !selectedOptions.voice && onSaveAll && (
            <button
              onClick={() => handleDownload(onSavePGN)}
              style={{
                width: "100%",
                padding: "10px",
                background: "linear-gradient(135deg, #a6e3a1, #94e2d5)",
                color: "#1e1e2e",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Descargar PGN + Análisis
            </button>
          )}

          {hasUnsavedData && !selectedOptions.pgn && !selectedOptions.analysis && !selectedOptions.voice && (
            <button
              onClick={onConfirm}
              style={{
                width: "100%",
                padding: "10px",
                background: "#f38ba8",
                color: "#1e1e2e",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Salir sin guardar
            </button>
          )}

          {hasUnsavedData && (selectedOptions.pgn || selectedOptions.analysis || selectedOptions.voice) && (
            <>
              {selectedOptions.pgn && onSavePGN && (
                <button
                  onClick={() => handleDownload(onSavePGN)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "#45475a",
                    color: "#cdd6f4",
                    border: "1px solid #585b70",
                    borderRadius: "8px",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Guardar solo PGN
                </button>
              )}
              {selectedOptions.analysis && onSaveAnalysis && (
                <button
                  onClick={() => handleDownload(onSaveAnalysis)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "#45475a",
                    color: "#cdd6f4",
                    border: "1px solid #585b70",
                    borderRadius: "8px",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Guardar solo Análisis
                </button>
              )}
              {selectedOptions.voice && onSaveVoice && (
                <button
                  onClick={() => handleDownload(onSaveVoice)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "#45475a",
                    color: "#cdd6f4",
                    border: "1px solid #585b70",
                    borderRadius: "8px",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Guardar solo Voz
                </button>
              )}
            </>
          )}

          {!hasUnsavedData && (
            <button
              onClick={onConfirm}
              style={{
                width: "100%",
                padding: "10px",
                background: "#f38ba8",
                color: "#1e1e2e",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Salir
            </button>
          )}

          <button
            onClick={onCancel}
            style={{
              width: "100%",
              padding: "10px",
              background: "transparent",
              color: "#a6adc8",
              border: "1px solid #45475a",
              borderRadius: "8px",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
