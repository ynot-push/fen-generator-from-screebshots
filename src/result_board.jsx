import { useMemo, useState } from "react";
import { Chessboard, ChessboardProvider, SparePiece } from "react-chessboard";
import "./result_board.css";

const FILES = "abcdefgh";

const TRAY = [
  ["wK", "wQ", "wR", "wB", "wN", "wP"],
  ["bK", "bQ", "bR", "bB", "bN", "bP"],
];

/* "rk6/p5p1/..." -> { a8: "bR", ... } */
function fenToPosition(placement) {
  const pos = {};

  placement.split("/").forEach((row, r) => {
    let f = 0;

    for (const ch of row) {
      if (/\d/.test(ch)) {
        f += Number(ch);
      } else {
        const color = ch === ch.toUpperCase() ? "w" : "b";
        pos[FILES[f] + (8 - r)] = color + ch.toUpperCase();
        f++;
      }
    }
  });

  return pos;
}

/* { a8: "bR", ... } -> "rk6/p5p1/..." */
function positionToPlacement(pos) {
  return Array.from({ length: 8 }, (_, r) => {
    let out = "";
    let empty = 0;

    for (let f = 0; f < 8; f++) {
      const p = pos[FILES[f] + (8 - r)];

      if (!p) {
        empty++;
      } else {
        if (empty) {
          out += empty;
          empty = 0;
        }

        out += p[0] === "w" ? p[1] : p[1].toLowerCase();
      }
    }

    return out + (empty || "");
  }).join("/");
}

/* { e4: "bN" } -> { e4: { pieceType: "bN" } } */
function toBoardPosition(pos) {
  return Object.fromEntries(
    Object.entries(pos).map(([sq, pieceType]) => [
      sq,
      { pieceType },
    ])
  );
}

/* { whiteKingSide: true, ... } -> "Kkq" or "-" */
function castlingToString(c) {
  return (
    (c.whiteKingSide ? "K" : "") +
    (c.whiteQueenSide ? "Q" : "") +
    (c.blackKingSide ? "k" : "") +
    (c.blackQueenSide ? "q" : "") ||
    "-"
  );
}

/* Backend predictions -> { a8: 0.99, b8: 0.87, ... } */
function predictionsToConfidences(predictions) {
  const result = {};

  for (const prediction of predictions ?? []) {
    const file = FILES[prediction.col];
    const rank = 8 - prediction.row;
    const square = `${file}${rank}`;

    result[square] = prediction.confidence;
  }

  return result;
}

function squareStyle(square) {
  return {
    left: `${FILES.indexOf(square[0]) * 12.5}%`,
    top: `${(8 - Number(square[1])) * 12.5}%`,
  };
}

const CONF_COLORS = {
  high: "rgba(120, 150, 70, 0.55)",
  medium: "rgba(220, 175, 60, 0.6)",
  low: "rgba(240, 110, 80, 0.65)",
};

function confidenceLevel(c) {
  if (c >= 0.95) return "high";
  if (c >= 0.85) return "medium";
  return "low";
}

function TrayPiece({ piece, selected, onSelect }) {
  const tone = piece[0] === "b" ? "on-light" : "on-dark";

  return (
    <div
      className={`tray-piece ${tone}${selected ? " is-selected" : ""}`}
      onClick={() => onSelect(piece)}
      title="Drag onto the board, or click then click a square"
    >
      <SparePiece pieceType={piece} width={46} />
    </div>
  );
}

export default function Board({
  fen: detectedFen,
  predictions,
  boardConfidence,
  checkerScore,
  turn,
  castling,
}) {
  const [position, setPosition] = useState(() =>
    fenToPosition(detectedFen)
  );

  const [showOverlay, setShowOverlay] = useState(true);
  const [tool, setTool] = useState(null);
  const [copied, setCopied] = useState(false);

  const confidences = useMemo(
    () => predictionsToConfidences(predictions),
    [predictions]
  );
  const confidenceSquareStyles = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(confidences).map(([sq, c]) => [
          sq,
          {
            backgroundColor: CONF_COLORS[confidenceLevel(c)],
          },
        ])
      ),
    [confidences]
  );

  const fen = useMemo(
    () =>
      `${positionToPlacement(position)} ${turn} ${castlingToString(
        castling
      )} - 0 1`,
    [position, turn, castling]
  );

  const lichessUrl = `https://lichess.org/analysis/${fen.replace(
    / /g,
    "_"
  )}`;

  const reset = () => {
    setPosition(fenToPosition(detectedFen));
    setTool(null);
  };

  const handleDrop = ({ piece, sourceSquare, targetSquare }) => {
    setPosition((prev) => {
      const next = { ...prev };

      if (!targetSquare) {
        if (!piece.isSparePiece) {
          delete next[sourceSquare];
        }

        return next;
      }

      if (piece.isSparePiece) {
        next[targetSquare] = piece.pieceType;
      } else {
        delete next[sourceSquare];
        next[targetSquare] = piece.pieceType;
      }

      return next;
    });

    return true;
  };

  const handleSquareClick = ({ square }) => {
    if (!tool) return;

    setPosition((prev) => ({
      ...prev,
      [square]: tool,
    }));
  };

  const copyFen = async () => {
    try {
      await navigator.clipboard.writeText(fen);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      document.getElementById("fen-input")?.select();
    }
  };

  const options = {
    id: "detected-board",
    position: toBoardPosition(position),
    onPieceDrop: handleDrop,
    onSquareClick: handleSquareClick,
    allowDragOffBoard: true,

    squareStyles: showOverlay
      ? confidenceSquareStyles
      : {},

    darkSquareStyle: {
      backgroundColor: "#a07b55",
    },

    lightSquareStyle: {
      backgroundColor: "#d8c3a2",
    },

    boardStyle: {
      borderRadius: "8px",
      overflow: "hidden",
    },
  };

  return (
    <div className="board-container">
      <header className="board-head">
        <div>
          <h1>Detected board</h1>

          <p>
            If the generated FEN is wrong, you can edit it below by
            picking a piece on the right or dragging pieces to correct
            a mistake.
          </p>
        </div>

        <div className="toolbar">
          <button
            type="button"
            className={`toggle${showOverlay ? " is-on" : ""}`}
            role="switch"
            aria-checked={showOverlay}
            onClick={() => setShowOverlay((v) => !v)}
          >
            <span
              className="toggle-track"
              aria-hidden="true"
            />

            Confidence
          </button>

          <button
            type="button"
            className="btn"
            onClick={reset}
          >
            Reset
          </button>
        </div>
      </header>

      <ChessboardProvider options={options}>
        <div className="editor">

          <div className="chessboard-wrapper">
            <Chessboard />

            {showOverlay && (
              <>

                <div className="acc-pill">
                  <span className="acc-pill-dot" />

                  <span>
                    Board detection{" "}
                    <b>
                      {Math.round(boardConfidence * 100)}%
                    </b>
                  </span>

                  <span>
                    Refinement{" "}
                    <b>
                      {Math.round(checkerScore * 100)}%
                    </b>
                  </span>
                </div>

                {/* Per-square confidence */}
                <div className="board-overlay">
                  {Object.entries(confidences).map(
                    ([square, c]) => (
                      <div
                        key={square}
                        className="square-overlay"
                        style={squareStyle(square)}
                      >
                        <span className="confidence-badge">
                          {Math.round(c * 100)}%
                        </span>
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </div>

          <div className="piece-tray">
            <span className="tray-title">
              Set up position
            </span>

            {TRAY.map((row, i) => (
              <div className="piece-row" key={i}>
                {row.map((piece) => (
                  <TrayPiece
                    key={piece}
                    piece={piece}
                    selected={tool === piece}
                    onSelect={(p) =>
                      setTool((t) => (t === p ? null : p))
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </ChessboardProvider>

      <div className="fen-section">
        <label
          className="fen-label"
          htmlFor="fen-input"
        >
          FEN
        </label>

        <div className="fen-field">
          <input
            id="fen-input"
            className="fen-input"
            value={fen}
            readOnly
            spellCheck="false"
          />

          <button
            type="button"
            className="fen-copy"
            onClick={copyFen}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <a
          className="lichess-btn"
          href={lichessUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Lichess analysis

          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M7 17 17 7m0 0H8m9 0v9" />
          </svg>
        </a>
      </div>
    </div>
  );
}