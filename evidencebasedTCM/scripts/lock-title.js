// Next.js 16 sets process.title = "next-server (vX.Y.Z)" on dev start,
// which rewrites the terminal window title. Silently swallow writes
// so the title stays as we set it here.
const lockedTitle = "EBTCM Dev";
Object.defineProperty(process, "title", {
  get() {
    return lockedTitle;
  },
  set() {
    // ignore — prevents Next.js from rewriting the terminal title
  },
  configurable: false,
});
