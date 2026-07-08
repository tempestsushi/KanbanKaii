import { useCallback, useEffect, useState } from "react";

type BackendState = "checking" | "online" | "offline";

const labels: Record<BackendState, string> = {
  checking: "Checking",
  online: "Online",
  offline: "Offline",
};

export function BackendStatus() {
  const [state, setState] = useState<BackendState>("checking");

  const checkBackend = useCallback(async () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    if (!apiBaseUrl) {
      setState("offline");
      return;
    }

    setState("checking");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await fetch(new URL("/health", apiBaseUrl), {
        signal: controller.signal,
        headers: { "ngrok-skip-browser-warning": "1" },
      });
      setState(response.ok ? "online" : "offline");
    } catch {
      setState("offline");
    } finally {
      window.clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    void checkBackend();
    const handleFocus = () => void checkBackend();
    const handleOnline = () => void checkBackend();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
    };
  }, [checkBackend]);

  return (
    <button
      type="button"
      onClick={() => void checkBackend()}
      aria-label={`Backend ${labels[state]}. Click to check again.`}
      title="Backend service status — click to check again"
      className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2 text-[10px] font-semibold transition hover:brightness-95 sm:gap-2 sm:px-2.5 ${
        state === "online"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : state === "offline"
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : "border-slate-200 bg-slate-50 text-slate-500"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          state === "online"
            ? "bg-emerald-500"
            : state === "offline"
              ? "bg-rose-500"
              : "animate-pulse bg-slate-400"
        }`}
      />
      <span className="hidden min-[380px]:inline">{labels[state]}</span>
    </button>
  );
}
