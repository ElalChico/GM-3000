import React, { useMemo } from "react";
import { Chessboard } from "react-chessboard";

interface ChessgroundProps {
  fen: string;
  lastMove?: string[];
  orientation?: "white" | "black";
  viewOnly?: boolean;
  gameStatus?: "not-started" | "live" | "finished";
  darkSquare?: string;
  lightSquare?: string;
  id?: string;
  showNotation?: boolean;
  hidePieces?: boolean;
}

export const ChessgroundBoard: React.FC<ChessgroundProps> = ({
  fen,
  lastMove,
  orientation = "white",
  viewOnly = true,
  gameStatus = "live",
  darkSquare = "#B58863",
  lightSquare = "#F0D9B5",
  id,
  showNotation = true,
  hidePieces = false,
}) => {
  const boardId = useMemo(
    () => id || `board-${Math.random().toString(36).substring(2, 9)}`,
    [id]
  );

  const squareStyles: Record<string, React.CSSProperties> = {};
  if (lastMove && lastMove.length === 2) {
    squareStyles[lastMove[0]] = { backgroundColor: "rgba(255, 255, 0, 0.4)" };
    squareStyles[lastMove[1]] = { backgroundColor: "rgba(255, 255, 0, 0.4)" };
  }

  const hiddenPieces = hidePieces ? {
    wP: () => null, wN: () => null, wB: () => null,
    wR: () => null, wQ: () => null, wK: () => null,
    bP: () => null, bN: () => null, bB: () => null,
    bR: () => null, bQ: () => null, bK: () => null,
  } : undefined;

  return (
    <div
      style={{
        width: "100%",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
      }}
    >
      <div
        className="shadow-2xl rounded-xl overflow-hidden relative"
        style={{
          width: "100%",
          display: "block"
        }}
      >
        <Chessboard
          key={boardId}
          options={{
            id: boardId,
            position: fen,
            boardOrientation: orientation,
            allowDragging: !viewOnly,
            darkSquareStyle: { backgroundColor: darkSquare },
            lightSquareStyle: { backgroundColor: lightSquare },
            squareStyles: squareStyles,
            animationDurationInMs: 250,
            showRankAndFile: showNotation,
            customPieces: hiddenPieces,
          }}
        />
      </div>
    </div>
  );
};
