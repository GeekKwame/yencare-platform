import { useEffect, useState } from "react";

export default function ConnectivityBanner() {
  const [state, setState] = useState(navigator.onLine ? "online" : "offline");

  useEffect(() => {
    function goOnline() {
      setState("restored");
      const timer = window.setTimeout(() => setState("online"), 2500);
      return () => window.clearTimeout(timer);
    }
    function goOffline() {
      setState("offline");
    }

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (state === "online") return null;

  const copy =
    state === "offline"
      ? "You are offline. Saved appointment details stay on this page."
      : "Connection restored. Live queue and booking updates will resume.";

  return (
    <div
      className={`fixed top-0 z-[60] w-full px-4 py-2 text-center text-xs font-medium ${
        state === "offline"
          ? "bg-[#173b3a] text-white"
          : "bg-[#E7F5F1] text-[#176b5f]"
      }`}
    >
      <span>{copy}</span>
      {state === "offline" ? (
        <button
          type="button"
          onClick={() => {
            if (navigator.onLine) {
              setState("restored");
              window.setTimeout(() => setState("online"), 2500);
            } else {
              window.location.reload();
            }
          }}
          className="ml-3 underline underline-offset-2"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
