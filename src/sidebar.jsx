import React, { useState } from "react";
import { Settings, MousePointer2, Crown, ChevronDown } from "lucide-react";
import "./sidebar.css";

export default function ScreenshotToFen() {
  const [turn, setTurn] = useState("w");

  const [castling, setCastling] = useState({
    whiteKingSide: true,
    whiteQueenSide: true,
    blackKingSide: true,
    blackQueenSide: true,
  });

  const options = [
    { key: "whiteKingSide", label: "White King side" },
    { key: "whiteQueenSide", label: "White Queen side" },
    { key: "blackKingSide", label: "Black King side" },
    { key: "blackQueenSide", label: "Black Queen side" },
  ];

  const handleToggle = (key) => {
    setCastling((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <aside className="s2f">
      <div className="board-settings">
        <Settings className="board-settings-icon" />
        <div>
          <div className="board-settings-title">Board settings</div>
          <div className="board-settings-description">
            Configure how the pieces are detected
          </div>
        </div>
      </div>

      <section className="side-card">
        <div className="side-card-head">
          <MousePointer2 className="side-card-icon" />
          <span className="side-card-title">Side to move</span>
        </div>

        <div className="select-wrap">
          <select
            className="s2f-input"
            value={turn}
            onChange={(e) => setTurn(e.target.value)}
          >
            <option value="w">White</option>
            <option value="b">Black</option>
          </select>
          <ChevronDown className="select-chevron" />
        </div>
      </section>

      <section className="side-card">
        <div className="side-card-head side-card-head--stacked">
          <Crown className="side-card-icon side-card-icon--light" />
          <div>
            <div className="side-card-title">Castling rights</div>
            <div className="side-card-sub">Select available castling rights</div>
          </div>
        </div>

        <div className="castling-list">
          {options.map(({ key, label }) => (
            <div key={key} className="castling-item">
              <div className="castling-left">
                
                <span className="castling-label">{label}</span>
              </div>

              <label className="switch">
                <input
                  type="checkbox"
                  checked={castling[key]}
                  onChange={() => handleToggle(key)}
                />
                <span className="slider"></span>
              </label>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
