import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import "./header.css";
import logo from "./assests/LOGO.png";

export function Brand() {
  return (
    <div className="brand-block">
      <div className="logo">
        <img src={logo} alt="FEN Generator Logo" />
      </div>

      <div className="brand">
        <div className="brand-name">
          <span>FEN</span> .Generator
        </div>
        <div className="brand-subtitle">Screenshot → FEN</div>
      </div>
    </div>
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("theme") || "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch {}
  }, [theme]);

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <span className="theme-toggle-knob" aria-hidden="true" />
      <Sun size={15} className={`theme-toggle-icon${!isDark ? " is-active" : ""}`} />
      <Moon size={15} className={`theme-toggle-icon${isDark ? " is-active" : ""}`} />
    </button>
  );
}