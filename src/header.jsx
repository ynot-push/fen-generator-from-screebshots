import { Sun, ChevronDown } from "lucide-react";
import "./header.css";
import logo from "./assests/LOGO.png";

export default function Header() {
  return (
    <header className="header">
      <div className="header-left">
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

      <div className="header-right">
        <button type="button" className="theme-button" aria-label="Theme">
          <Sun size={17} />
          <ChevronDown size={12} className="theme-chevron" />
        </button>
      </div>
    </header>
  );
}
