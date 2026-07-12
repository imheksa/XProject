export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startWorkerLoop } = await import("@/lib/worker");
    startWorkerLoop();
  }
}
