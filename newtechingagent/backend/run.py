import os

import uvicorn

if __name__ == "__main__":
    reload = os.getenv("UVICORN_RELOAD", "0") == "1"
    port = int(os.getenv("PORT", "8088"))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=reload)
