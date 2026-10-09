import { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload,
  X,
  RefreshCw,
  Trash2,
  Maximize2,
  WandSparkles,
} from "lucide-react";

import "./App.css";
import ScreenshotToFen from "./sidebar.jsx";
import { ThemeToggle } from "./header.jsx";
import logo from "./assests/LOGO.png";
import Board from "./result_board.jsx";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

async function extractFenFromScreenshot(file) {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("http://127.0.0.1:8000/extract_fen", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to extract FEN");
  }

  return await response.json();
}

function App() {
  const [imageSrc, setImageSrc] = useState(null);
  const [status, setStatus] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [generate, setGenerate] = useState(false);

  const [result, setResult] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  const [turn, setTurn] = useState("w");

  const [castling, setCastling] = useState({
    whiteKingSide: true,
    whiteQueenSide: true,
    blackKingSide: true,
    blackQueenSide: true,
  });

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
    setImageFile(file);

    setResult(null);
    setGenerate(false);

    setStatus("Image uploaded");

    const reader = new FileReader();

    reader.onload = (e) => {
      setImageSrc(e.target.result);
    };

    reader.readAsDataURL(file);
  }, []);

  useEffect(() => {
    const onPaste = (e) => {
      const item = Array.from(e.clipboardData?.items || []).find((i) =>
        i.type.startsWith("image/")
      );

      if (item) {
        handleFile(item.getAsFile());
      }
    };

    window.addEventListener("paste", onPaste);

    return () => {
      window.removeEventListener("paste", onPaste);
    };
  }, [handleFile]);


  const openPicker = () => {
    inputRef.current?.click();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();

    dragDepth.current += 1;
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();

    dragDepth.current = Math.max(0, dragDepth.current - 1);

    if (dragDepth.current === 0) {
      setDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();

    dragDepth.current = 0;
    setDragging(false);

    const file = e.dataTransfer.files?.[0];

    if (file) {
      handleFile(file);
    }
  };

  const handleRemove = (e) => {
    e?.stopPropagation();

    setImageSrc(null);
    setImageFile(null);
    setResult(null);
    setGenerate(false);
    setStatus("");
    setPreviewOpen(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleChange = (e) => {
    e.stopPropagation();

    openPicker();
  };

  const handleGenerate = async () => {
    if (!imageFile) {
      return;
    }

    setStatus("Extracting position...");

    try {
      const data = await extractFenFromScreenshot(imageFile);

      console.log("Backend result:", data);
      setResult(data);
      setGenerate(true);
      setStatus("");
    } catch (error) {
      console.error(error);

      setStatus(
        error.message || "Failed to process the image."
      );
    }
  };

  if (generate && result) {
    return (
      <div className="App">
        <div className="app-body">
          <ScreenshotToFen
            turn={turn}
            setTurn={setTurn}
            castling={castling}
            setCastling={setCastling}
          />

          <div className="right-col">
            <div className="topbar">
              <ThemeToggle />
            </div>

            <Board
              fen={result.fen}
              predictions={result.predictions}
              boardConfidence={result.board_confidence}
              checkerScore={result.checker_score}
              turn={turn}
              castling={castling}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="app-body">
        <ScreenshotToFen
          turn={turn}
          setTurn={setTurn}
          castling={castling}
          setCastling={setCastling}
        />

        <div className="right-col">
          <div className="topbar">
            <ThemeToggle />
          </div>

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
                  className={`dropzone ${
                    dragging ? "is-dragging" : ""
                  }`}
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
                  <Upload
                    className="dropzone-icon"
                    size={37}
                    strokeWidth={1.6}
                  />

                  {dragging ? (
                    <div className="dropzone-title">
                      Release to upload
                    </div>
                  ) : (
                    <>
                      <div className="dropzone-title">
                        Drop screenshot here
                      </div>

                      <div className="dropzone-sub">
                        or click to browse files
                      </div>
                    </>
                  )}

                  <div className="dropzone-meta">
                    PNG, JPG • Max 10 MB
                  </div>
                </div>
              )}

              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];

                  if (file) {
                    handleFile(file);
                  }

                  e.target.value = "";
                }}
              />

              {status && (
                <p className="s2f-status">
                  {status}
                </p>
              )}

              {!imageSrc && (
                <div className="empty-state">
                  <img
                    src={logo}
                    alt=""
                    className="empty-logo"
                  />

                  <div className="empty-title">
                    Your board will appear here
                  </div>

                  <div className="empty-sub">
                    Take a screenshot or paste an image to generate the FEN
                  </div>
                </div>
              )}
              {imageSrc && (
                <button
                  className="generate-btn"
                  onClick={handleGenerate}
                  disabled={!imageFile}
                >
                  <WandSparkles size={14} />
                  Generate FEN
                </button>
              )}

            </div>
          </main>
        </div>
      </div>

      {previewOpen && (
        <div
          className="image-overlay"
          onClick={() => setPreviewOpen(false)}
        >
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