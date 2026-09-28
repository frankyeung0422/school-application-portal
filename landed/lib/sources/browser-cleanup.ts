import { execFile } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Chromium leaves lock files behind when a run is killed; a locked profile
// makes launchPersistentContext fail until they are removed.
const LOCK_FILES = ["SingletonLock", "SingletonCookie", "SingletonSocket", "parent.lock", "lockfile"];

export async function killBrowsersForProfile(profileDir: string): Promise<void> {
  if (process.platform !== "win32") return;
  const needle = profileDir.replace(/\//g, "\\");
  try {
    // Kill chrome/chromium processes whose command line references this profile.
    const ps = `Get-CimInstance Win32_Process -Filter "Name='chrome.exe' OR Name='chromium.exe' OR Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*${needle}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
    await execFileAsync("powershell", ["-NoProfile", "-Command", ps], {
      timeout: 30000,
    });
  } catch {
    // best-effort
  }
}

export async function removeProfileLocks(profileDir: string): Promise<void> {
  for (const f of LOCK_FILES) {
    await rm(path.join(profileDir, f), { force: true }).catch(() => {});
  }
}

export async function cleanProfile(profileDir: string): Promise<void> {
  await killBrowsersForProfile(profileDir);
  await removeProfileLocks(profileDir);
}
