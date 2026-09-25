import { Menu, Moon, Sun } from "lucide-react";
import { useApp } from "../../../app/AppContext.jsx";

export function Topbar() {
  const app = useApp();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="mobile-nav-button"
          type="button"
          aria-label="Open sidebar"
          onClick={() => app.setSidebarOpen(true)}
        >
          <Menu size={19} />
        </button>

        <a
          className="codarox-product-link"
          href="https://codarox.com/"
          target="_blank"
          rel="noreferrer"
          aria-label="Visit Codarox"
        >
          A Codarox product
        </a>
      </div>

      <div className="topbar-actions">
        <button
          className="icon-button"
          type="button"
          aria-label="Toggle theme"
          onClick={app.toggleTheme}
        >
          {app.dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
