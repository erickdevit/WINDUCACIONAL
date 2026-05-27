import { canDisplayAppForUser } from "../../lib/appVisibility";

export const MOBILE_PORTRAIT_QUERY =
  "(max-width: 480px) and (orientation: portrait)";
export const MOBILE_PORTRAIT_APP_LIMIT = 5;

export const getMobilePortraitTaskApps = ({
  taskApps,
  apps,
  user,
  limit = MOBILE_PORTRAIT_APP_LIMIT,
}) => {
  const runningApps = Object.keys(apps)
    .filter((key) => key !== "hz" && key !== "undefined")
    .map((key) => apps[key])
    .filter(
      (app) => app && app.hide === false && canDisplayAppForUser(app, user)
    )
    .sort((appA, appB) => (appB.z || 0) - (appA.z || 0));

  return (runningApps.length > 0 ? runningApps : taskApps).slice(0, limit);
};

export const matchesMobilePortrait = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.(MOBILE_PORTRAIT_QUERY).matches;
