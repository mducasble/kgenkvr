import type { ElectronAPI } from "../../preload/preload";

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

/**
 * Hook to access the Electron API exposed via contextBridge.
 * Throws in non-Electron environments (e.g., browser dev mode without preload).
 */
export function useElectronAPI(): ElectronAPI {
  if (!window.electronAPI) {
    throw new Error(
      "window.electronAPI is not defined. Ensure the preload script is loaded."
    );
  }
  return window.electronAPI;
}

/**
 * Safe version — returns null when not in Electron context.
 * Useful for components that can run in both contexts.
 */
export function useElectronAPISafe(): ElectronAPI | null {
  return window.electronAPI ?? null;
}
