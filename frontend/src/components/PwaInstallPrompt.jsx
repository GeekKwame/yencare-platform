import { useEffect, useState } from "react";
import { Button } from "./ui";

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("yencare_pwa_dismissed") === "true";
  });
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  });

  useEffect(() => {
    if (isInstalled || isDismissed) {
      return;
    }

    const handleBeforeInstall = (e) => {
      // Prevent browser default mini-infobar
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [isInstalled, isDismissed]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem("yencare_pwa_dismissed", "true");
  };

  if (isInstalled || isDismissed || !deferredPrompt) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Install App"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-[#087F6C]/30 bg-white p-4 shadow-xl backdrop-blur-md transition-all duration-300 md:bottom-6 md:right-6 md:left-auto"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E7F5F1] text-[#087F6C]">
          <span className="material-symbols-outlined text-[24px]">install_mobile</span>
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-[#087F6C]">
            Install YɛnCare App
          </p>
          <p className="mt-0.5 text-xs text-[#66706B] leading-relaxed">
            Install on your phone or desktop for instant clinic queue updates and offline access.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleInstallClick}
              className="text-xs font-semibold"
            >
              Install App
            </Button>
            <button
              type="button"
              onClick={handleDismiss}
              className="px-2.5 py-1.5 text-xs font-medium text-[#66706B] hover:text-[#111111] transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
