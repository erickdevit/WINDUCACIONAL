export const canDisplayAppForUser = (app, user) => {
  if (!app) return false;
  if (app.professorOnly && user?.role !== "professor") return false;
  if (user?.role === "professor") return true;
  if (!app.studentAccess) return true;

  const studentType = user?.studentType === "kids" ? "kids" : "normal";
  return app.studentAccess === studentType;
};

export const filterAppsForUser = (apps, user) =>
  (apps || []).filter((app) => canDisplayAppForUser(app, user));
