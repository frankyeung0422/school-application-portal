import "dotenv/config";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import path from "node:path";

// One command that runs everything: migrations, seed, the job worker and the
// web UI, with prefixed logs in a single console (startup.bat is the Windows
// two-window equivalent). Without the worker, searches stay PENDING and
// supermarket prices never sync — so both always start together.

const ROOT = path.resolve(__dirname, "..");
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function step(name: string, cmd: string, args: string[]) {
  process.stdout.write(`[start] ${name}…\n`);
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: "inherit", env: process.env, shell: process.platform === "win32" });
  if (r.status !== 0) {
    process.stdout.write(`[start] ${name} failed — aborting.\n`);
    process.exit(r.status ?? 1);
  }
}

const children: ChildProcess[] = [];

function run(label: string, args: string[], colour: string) {
  const child = spawn(npm, args, { cwd: ROOT, env: process.env, shell: process.platform === "win32" });
  children.push(child);
  const write = (chunk: Buffer, stream: NodeJS.WriteStream) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (line.trim()) stream.write(`${colour}[${label}]\x1b[0m ${line}\n`);
    }
  };
  child.stdout?.on("data", (c: Buffer) => write(c, process.stdout));
  child.stderr?.on("data", (c: Buffer) => write(c, process.stderr));
  child.on("exit", (code) => {
    process.stdout.write(`${colour}[${label}]\x1b[0m exited (${code}) — stopping everything.\n`);
    shutdown();
  });
  return child;
}

let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  for (const c of children) {
    if (c.pid && c.exitCode === null) {
      if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(c.pid), "/T", "/F"], { stdio: "ignore" });
      else c.kill("SIGTERM");
    }
  }
  setTimeout(() => process.exit(0), 500);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

step("migrations", npx, ["prisma", "migrate", "deploy"]);
step("seed defaults", npm, ["run", "seed"]);
run("worker", ["run", "worker"], "\x1b[36m");
run("web", ["run", "dev"], "\x1b[32m");
process.stdout.write(`[start] http://localhost:6565 — admin@landed.local / ${process.env.ADMIN_PASSWORD ?? "landed-admin-2026"}\n`);
