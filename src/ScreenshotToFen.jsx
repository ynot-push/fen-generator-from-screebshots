import React, { useState, useCallback, useEffect } from "react";
import "./ScreenshotToFen.css";
/**
 * ---------------------------------------------------------------------------
 * PLUG YOUR MODEL / ALGORITHM IN HERE.
 * Receives the uploaded screenshot as a data URL. Should resolve to the FEN
 * piece-placement string only (the first field of a FEN), e.g.:
 *   "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR"
 * Return null while unimplemented so the UI can show a clear "not wired up"
 * state instead of a wrong board.
 * ---------------------------------------------------------------------------
 */
async function extractPlacementFromScreenshot(imageDataUrl) {
  // TODO: call your vision model / FEN-extraction algorithm here.
  return null;
}

const PIECE_UNICODE = {
  K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
  k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
};

function placementToGrid(placement) {
  return placement.split("/").map((row) => {
    const cells = [];
    for (const ch of row) {
      if (/[1-8]/.test(ch)) cells.push(...Array(Number(ch)).fill(null));
      else cells.push(ch);
    }
    return cells;
  });
}

function buildFen({ placement, turn, castling, enPassant, halfmove, fullmove }) {
  const board = placement || "8/8/8/8/8/8/8/8";
  let castle = "";
  if (castling.wk) castle += "K";
  if (castling.wq) castle += "Q";
  if (castling.bk) castle += "k";
  if (castling.bq) castle += "q";
  if (!castle) castle = "-";
  let ep = (enPassant || "-").trim() || "-";
  if (ep !== "-" && !/^[a-h][36]$/.test(ep)) ep = "-";
  return [board, turn, castle, ep, halfmove || 0, fullmove || 1].join(" ");
}

export default function ScreenshotToFen() {
  const [imageSrc, setImageSrc] = useState(null);
  const [placement, setPlacement] = useState(null);
  const [status, setStatus] = useState("");
  const [turn, setTurn] = useState("w");
  const [castling, setCastling] = useState({ wk: false, wq: false, bk: false, bq: false });
  const [enPassant, setEnPassant] = useState("-");
  const [halfmove, setHalfmove] = useState(0);
  const [fullmove, setFullmove] = useState(1);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleFile = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      setImageSrc(dataUrl);
      setPlacement(null);
      setStatus("Extracting position…");
      const result = await extractPlacementFromScreenshot(dataUrl);
      if (result) {
        setPlacement(result);
        setStatus("");
      } else {
        setStatus("Algorithm not wired up yet — see extractPlacementFromScreenshot().");
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const onInputChange = (e) => handleFile(e.target.files[0]);
  const onDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };
  const onPaste = (e) => {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
    if (item) handleFile(item.getAsFile());
  };

  const fen = buildFen({ placement, turn, castling, enPassant, halfmove, fullmove });
  const grid = placement ? placementToGrid(placement) : null;

  const copyFen = async () => {
    try {
      await navigator.clipboard.writeText(fen);
      setToast("FEN copied to clipboard.");
    } catch (e) {
      setToast("Could not copy — select and copy manually.");
    }
  };

  // Chess.com has no supported URL parameter that auto-loads a FEN (it's a
  // long-standing, unfulfilled forum request), so the closest we can do is
  // copy the FEN and open their analysis board for a manual paste.
  const openChessCom = async () => {
    try {
      await navigator.clipboard.writeText(fen);
    } catch (e) {}
    window.open("https://www.chess.com/analysis", "_blank");
    setToast('FEN copied — paste it into Chess.com\'s "Load From FEN" box and click Load.');
  };

  // Lichess *does* support the FEN directly in the URL, so this tab opens
  // already showing the position — no paste needed. Remove if you don't want it.
  const openLichess = () => {
    window.open(`https://lichess.org/analysis/standard/${encodeURIComponent(fen.replace(/ /g, "_"))}`, "_blank");
  };

  return (
    <div className="s2f" onPaste={onPaste}>

      <h1 className="s2f-title">Screenshot → FEN</h1>

      <section className="s2f-card">
        <div
          className="s2f-drop"
          onClick={() => document.getElementById("s2f-input").click()}
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {imageSrc ? (
            <img src={imageSrc} alt="uploaded screenshot" className="s2f-preview" />
          ) : (
            <span>Click, drop, or paste (Ctrl/Cmd+V) your board screenshot here</span>
          )}
        </div>
        <input
          id="s2f-input"
          type="file"
          accept="image/*"
          onChange={onInputChange}
          style={{ display: "none" }}
        />
        {status && <p className="s2f-status">{status}</p>}
      </section>

      {grid && (
        <section className="s2f-card">
          <div className="s2f-board">
            {grid.flat().map((piece, i) => {
              const r = Math.floor(i / 8);
              const c = i % 8;
              return (
                <div key={i} className={`s2f-sq ${(r + c) % 2 === 0 ? "light" : "dark"}`}>
                  {piece ? PIECE_UNICODE[piece] : ""}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="s2f-card">
        <div className="s2f-row">
          <label className="s2f-field">
            Side to move
            <select className="s2f-input" value={turn} onChange={(e) => setTurn(e.target.value)}>
              <option value="w">White</option>
              <option value="b">Black</option>
            </select>
          </label>
          <label className="s2f-field">
            En passant square
            <input
              className="s2f-input"
              type="text"
              value={enPassant}
              onChange={(e) => setEnPassant(e.target.value)}
              placeholder="- or e.g. e3"
            />
          </label>
        </div>
        <div className="s2f-row">
          <label className="s2f-field">
            Halfmove clock
            <input
              className="s2f-input"
              type="number"
              min="0"
              value={halfmove}
              onChange={(e) => setHalfmove(e.target.value)}
            />
          </label>
          <label className="s2f-field">
            Fullmove number
            <input
              className="s2f-input"
              type="number"
              min="1"
              value={fullmove}
              onChange={(e) => setFullmove(e.target.value)}
            />
          </label>
        </div>
        <div className="s2f-checks">
          {[
            ["wk", "White O-O"],
            ["wq", "White O-O-O"],
            ["bk", "Black O-O"],
            ["bq", "Black O-O-O"],
          ].map(([key, label]) => (
            <label key={key} className="s2f-check">
              <input
                type="checkbox"
                checked={castling[key]}
                onChange={(e) => setCastling({ ...castling, [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>
      </section>

      <section className="s2f-card">
        <input className="s2f-input s2f-fen" type="text" value={fen} readOnly />
        <div className="s2f-actions">
          <button className="s2f-btn" onClick={copyFen}>Copy FEN</button>
          <button className="s2f-btn s2f-btn-ghost" onClick={openLichess}>Open in Lichess (auto-loads)</button>
          <button className="s2f-btn s2f-btn-primary" onClick={openChessCom}>Open in Chess.com Analysis</button>
        </div>
      </section>

      {toast && <div className="s2f-toast">{toast}</div>}
    </div>
  );
}

