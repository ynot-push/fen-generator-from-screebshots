import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "@fontsource-variable/outfit";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import './index.css'
import App from './App.jsx'

try {
  document.documentElement.setAttribute(
    "data-theme",
    localStorage.getItem("theme") || "dark"
  );
} catch {}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)