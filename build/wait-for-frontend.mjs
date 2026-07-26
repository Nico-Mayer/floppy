// Blocks until the Vite dev server accepts connections, so `wails3 task run`
// never races it. Without this the app can start before Vite binds the port
// (cold optimizer cache / slow process spawn, mostly on Windows) and dies with
// "unable to connect to frontend server".
const port = process.env.WAILS_VITE_PORT ?? "9245";
const url = process.env.FRONTEND_DEVSERVER_URL ?? `http://localhost:${port}`;
const deadline = Date.now() + 60_000;

while (Date.now() < deadline) {
    try {
        // Any HTTP response means the server is up.
        await fetch(url);
        process.exit(0);
    } catch {
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
}

console.error(`frontend dev server not reachable at ${url} after 60s`);
process.exit(1);
