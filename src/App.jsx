import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, X, RefreshCw, Trash2, Maximize2 ,WandSparkles } from "lucide-react";
import "./App.css";
import ScreenshotToFen from "./sidebar.jsx";
import Header from "./header.jsx";
import logo from "./assests/LOGO.png";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const PIECE_UNICODE = {
  K: "♔",
  Q: "♕",
  R: "♖",
  B: "♗",
  N: "♘",
  P: "♙",
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};

function placementToGrid(placement) {
  return placement.split("/").map((row) => {
    const cells = [];

    for (const char of row) {
      if (/[1-8]/.test(char)) {
        cells.push(...Array(Number(char)).fill(null));
      } else {
        cells.push(char);
      }
    }

    return cells;
  });
}

async function extractPlacementFromScreenshot(imageDataUrl) {
  return null;
}

function App() {
  const [imageSrc, setImageSrc] = useState(null);
  const [placement, setPlacement] = useState(null);
  const [status, setStatus] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const dragDepth = useRef(0);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) {
      setStatus("Please select an image file.");
      return;
    }

    if (file.size > MAX_SIZE) {
      setStatus("Image is too large (max 10 MB).");
      return;
    }

    const reader = new FileReader();

    reader.onload = async (e) => {
      const dataUrl = e.target.result;

      setImageSrc(dataUrl);
      setPlacement(null);
      setStatus("Extracting position...");

      try {
        const result = await extractPlacementFromScreenshot(dataUrl);

        if (result) {
          setPlacement(result);
          setStatus("");
        } else {
          setStatus("Image uploaded");
        }
      } catch (error) {
        console.error(error);
        setStatus("Failed to process the image.");
      }
    };

    reader.readAsDataURL(file);
  }, []);

  
  useEffect(() => {
    const onPaste = (e) => {
      const item = Array.from(e.clipboardData?.items || []).find((i) =>
        i.type.startsWith("image/")
      );
      if (item) handleFile(item.getAsFile());
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleFile]);

  const openPicker = () => inputRef.current?.click();

  const handleDragEnter = (e) => {
    e.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleRemove = (e) => {
    e.stopPropagation();

    setImageSrc(null);
    setPlacement(null);
    setStatus("");
    setPreviewOpen(false);

    if (inputRef.current) inputRef.current.value = "";
  };

  const handleChange = (e) => {
    e.stopPropagation();
    openPicker();
  };

  const grid = placement ? placementToGrid(placement) : null;

  return (
    <div className="App">
      <Header />

      <div className="app-body">
        <ScreenshotToFen />

        <main className="content">
          <div className="main-panel">
            {imageSrc ? (
              <div className="upload-card">
                <div className="upload-preview-box">
                  <img
                    src={imageSrc}
                    alt="Uploaded chessboard"
                    className="upload-preview"
                    onClick={() => setPreviewOpen(true)}
                  />

                  <button
                    type="button"
                    className="icon-btn icon-btn--close"
                    onClick={handleRemove}
                    aria-label="Remove image"
                  >
                    <X size={14} />
                  </button>

                  <button
                    type="button"
                    className="icon-btn icon-btn--expand"
                    onClick={() => setPreviewOpen(true)}
                    aria-label="Enlarge image"
                  >
                    <Maximize2 size={12} />
                  </button>
                </div>

                <div className="upload-actions">
                  <button
                    type="button"
                    className="action-btn"
                    onClick={handleChange}
                  >
                    <RefreshCw size={14} />
                    Change image
                  </button>

                  <button
                    type="button"
                    className="action-btn action-btn--danger"
                    onClick={handleRemove}
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`dropzone ${dragging ? "is-dragging" : ""}`}
                onClick={openPicker}
                onDrop={handleDrop}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={(e) => e.preventDefault()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openPicker();
                  }
                }}
              >
                <Upload className="dropzone-icon" size={37} strokeWidth={1.6} />

                {dragging ? (
                  <div className="dropzone-title">Release to upload</div>
                ) : (
                  <>
                    <div className="dropzone-title">Drop screenshot here</div>
                    <div className="dropzone-sub">or click to browse files</div>
                  </>
                )}

                <div className="dropzone-meta">PNG, JPG • Max 10 MB</div>
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />

            {status && <p className="s2f-status">{status}</p>}

            {!imageSrc && (
              <div className="empty-state">
                <img src={logo} alt="" className="empty-logo" />
                <div className="empty-title">Your board will appear here</div>
                <div className="empty-sub">
                  Take a screenshot or paste an image to generate the FEN
                </div>
              </div>
            )}

            {grid && (
              <section className="board-card">
                <div className="s2f-board">
                  {grid.flat().map((piece, index) => {
                    const row = Math.floor(index / 8);
                    const col = index % 8;
                    const squareColor = (row + col) % 2 === 0 ? "light" : "dark";

                    return (
                      <div key={index} className={`s2f-sq ${squareColor}`}>
                        {piece ? PIECE_UNICODE[piece] : ""}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {imageSrc && <button className="generate-btn"> 
              <WandSparkles size={14} />
              Generate FEN</button>}
          </div>
        </main>
      </div>

      {previewOpen && (
        <div className="image-overlay" onClick={() => setPreviewOpen(false)}>
          <img
            src={imageSrc}
            alt="Large chessboard preview"
            className="image-large"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default App;
