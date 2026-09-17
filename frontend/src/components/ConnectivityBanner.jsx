import { useEffect, useState } from "react";
import { Button } from "./ui";

export default function ConnectivityBanner() {
  const [state, setState] = useState(navigator.onLine ? "online" : "offline");

  useEffect(() => {
    let restoredTimer;
    function goOnline() {
      setState("restored");
      restoredTimer = window.setTimeout(() => setState("online"), 2500);
    }
    function goOffline() {
      setState("offline");
    }

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.clearTimeout(restoredTimer);
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
      role="status"
      aria-live="assertive"
      className={`connectivity-bar connectivity-${state} fixed top-0 z-[60] w-full justify-center`}
    >
      <span>{copy}</span>
      {state === "offline" ? (
        <Button
          variant="tertiary"
          className="ml-3 text-inherit"
          onClick={() => {
            if (navigator.onLine) {
              setState("restored");
              window.setTimeout(() => setState("online"), 2500);
            } else {
              window.location.reload();
            }
          }}
        >
          Try again
        </Button>
      ) : null}
    </div>
  );
}
