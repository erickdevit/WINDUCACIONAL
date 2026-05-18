const APP_VERSION_STORAGE_KEY = "simulador:app-version";
const VERSION_CHECK_INTERVAL_MS = 10000;

export const clearBrowserCaches = async () => {
  if (typeof window === "undefined") return;

  if ("caches" in window) {
    const cacheNames = await window.caches.keys();
    await Promise.all(
      cacheNames.map((cacheName) => window.caches.delete(cacheName))
    );
  }

  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map((registration) => registration.unregister())
    );
  }

  try {
    window.sessionStorage?.clear();
  } catch {}
};

export const reloadWithFreshApp = async (version) => {
  if (typeof window === "undefined") return;

  if (version) {
    window.localStorage.setItem(APP_VERSION_STORAGE_KEY, version);
  }

  await clearBrowserCaches();

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("appVersion", version || String(Date.now()));
  window.location.replace(nextUrl.toString());
};

export const startAppVersionWatcher = ({
  intervalMs = VERSION_CHECK_INTERVAL_MS,
} = {}) => {
  if (typeof window === "undefined") return () => {};

  let stopped = false;
  let running = false;

  const checkVersion = async () => {
    if (stopped || running) return;
    running = true;
    try {
      const url = `/api/app/version?ts=${Date.now()}`;
      const response = await fetch(url, {
        cache: "no-store",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });
      if (!response.ok) return;

      const data = await response.json();
      const nextVersion = String(data.version || "");
      if (!nextVersion) return;

      const currentVersion = window.localStorage.getItem(
        APP_VERSION_STORAGE_KEY
      );
      if (currentVersion && currentVersion !== nextVersion) {
        await reloadWithFreshApp(nextVersion);
        return;
      }
      window.localStorage.setItem(APP_VERSION_STORAGE_KEY, nextVersion);
    } catch {
      // A verificação é oportunista; falhas de rede não devem interromper o app.
    } finally {
      running = false;
    }
  };

  checkVersion();
  const timer = window.setInterval(checkVersion, intervalMs);
  const checkWhenVisible = () => {
    if (document.visibilityState === "visible") checkVersion();
  };

  window.addEventListener("focus", checkVersion);
  window.addEventListener("online", checkVersion);
  document.addEventListener("visibilitychange", checkWhenVisible);

  return () => {
    stopped = true;
    window.clearInterval(timer);
    window.removeEventListener("focus", checkVersion);
    window.removeEventListener("online", checkVersion);
    document.removeEventListener("visibilitychange", checkWhenVisible);
  };
};
