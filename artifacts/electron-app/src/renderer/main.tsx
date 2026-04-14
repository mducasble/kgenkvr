import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

if (!window.electronAPI) {
  import("./browserMock").then(({ browserMockAPI }) => {
    (window as unknown as Record<string, unknown>).electronAPI = browserMockAPI;
    mount();
  });
} else {
  mount();
}

function mount() {
  const root = document.getElementById("root");
  if (!root) throw new Error("Root element not found");
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
