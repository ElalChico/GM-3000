import { useState, useEffect, useCallback } from "react";

interface ExitGuardOptions {
  hasUnsavedData: () => boolean;
  onExit: () => void;
  onBeforeExit?: () => void;
  disabled?: boolean;
}

export function useExitGuard({ hasUnsavedData, onExit, onBeforeExit, disabled }: ExitGuardOptions) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const checkAndConfirm = useCallback(
    (action: () => void) => {
      if (disabled) {
        action();
        return;
      }
      if (hasUnsavedData()) {
        setPendingAction(() => action);
        setShowConfirm(true);
      } else {
        action();
      }
    },
    [hasUnsavedData, disabled]
  );

  const confirmExit = useCallback(() => {
    setShowConfirm(false);
    if (pendingAction) {
      onBeforeExit?.();
      pendingAction();
      setPendingAction(null);
    }
  }, [pendingAction, onBeforeExit]);

  const cancelExit = useCallback(() => {
    setShowConfirm(false);
    setPendingAction(null);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).electronAPI) {
      const api = (window as any).electronAPI;

      api.onConfirmExitRequest(() => {
        if (disabled || !hasUnsavedData()) {
          api.confirmExitActual();
          return;
        }
        setShowConfirm(true);
        setPendingAction(() => {
          api.confirmExitActual();
        });
      });

      return () => {
        api.removeConfirmExitListener();
      };
    }
  }, [hasUnsavedData, disabled]);

  useEffect(() => {
    if (disabled) return;

    // En Electron, el cierre se maneja via IPC (confirm-exit-request/confirm-exit-actual).
    // beforeunload bloquea el cierre nativo y causa que el botón X no funcione.
    const isElectron = !!(window as any).electronAPI;
    if (isElectron) return;

    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedData()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedData, disabled]);

  return {
    showConfirm,
    confirmExit,
    cancelExit,
    checkAndConfirm,
  };
}
