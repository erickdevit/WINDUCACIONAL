const request = async (path, options = {}) => {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Falha na comunicação com o servidor.");
  }
  return data;
};

export const api = {
  bootstrapStatus: () => request("/api/bootstrap/status"),
  appVersion: () => request("/api/app/version"),
  bootstrap: (payload) =>
    request("/api/bootstrap", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  me: () => request("/api/auth/me"),
  updateMyDisplayName: (displayName) =>
    request("/api/auth/me/display-name", {
      method: "PATCH",
      body: JSON.stringify({ displayName }),
    }),
  login: (payload) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  register: (payload) =>
    request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  logout: () =>
    request("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  getUsers: () => request("/api/users"),
  checkUsernameAvailability: (username) =>
    request(`/api/users/username/${encodeURIComponent(username)}/availability`),
  createUser: (payload) =>
    request("/api/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateUser: (id, payload) =>
    request(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  getFileTree: () => request("/api/fs/tree"),
  saveFileTree: (tree) =>
    request("/api/fs/tree", {
      method: "PUT",
      body: JSON.stringify({ tree }),
    }),
  // --- Turmas ---
  getTurmas: (studentType) => {
    const url = studentType
      ? `/api/turmas?studentType=${studentType}`
      : "/api/turmas";
    return request(url);
  },
  createTurma: (payload) =>
    request("/api/turmas", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateTurma: (id, payload) =>
    request(`/api/turmas/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteTurma: (id) =>
    request(`/api/turmas/${id}`, {
      method: "DELETE",
    }),
  // --- Digitação ---
  saveTypingScore: (payload) =>
    request("/api/typing/score", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  saveTypingGameScore: (payload) =>
    request("/api/typing/game/score", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getTypingGlobalRanking: (studentType) => {
    const url = studentType
      ? `/api/typing/ranking/global?studentType=${studentType}`
      : "/api/typing/ranking/global";
    return request(url);
  },
  getTypingTurmaRanking: () => request("/api/typing/ranking/turma"),
  getTypingTurmaRankingById: (turmaId, studentType) => {
    const params = studentType ? `?studentType=${studentType}` : "";
    return request(`/api/typing/ranking/turma/${turmaId}${params}`);
  },
  resetTypingTurmaRanking: (turmaCode, studentType) =>
    request("/api/typing/ranking/turma/reset", {
      method: "POST",
      body: JSON.stringify({ turmaCode, studentType }),
    }),
  getTypingGameGlobalRanking: (studentType) => {
    const url = studentType
      ? `/api/typing/game/ranking/global?studentType=${studentType}`
      : "/api/typing/game/ranking/global";
    return request(url);
  },
  getTypingGameTurmaRanking: () => request("/api/typing/game/ranking/turma"),
  getTypingGameTurmaRankingById: (turmaId, studentType) => {
    const params = studentType ? `?studentType=${studentType}` : "";
    return request(`/api/typing/game/ranking/turma/${turmaId}${params}`);
  },
  resetTypingGameTurmaRanking: (turmaCode, studentType) =>
    request("/api/typing/game/ranking/turma/reset", {
      method: "POST",
      body: JSON.stringify({ turmaCode, studentType }),
    }),
  getTypingSettings: (studentType, { effective = false } = {}) =>
    request(
      effective
        ? "/api/typing/settings/effective"
        : `/api/typing/settings/${studentType}`
    ),
  saveTypingSettings: (studentType, payload) =>
    request(`/api/typing/settings/${studentType}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  getTypingGameSettings: (studentType, { effective = false } = {}) =>
    request(
      effective
        ? "/api/typing/game/settings/effective"
        : `/api/typing/game/settings/${studentType}`
    ),
  saveTypingGameSettings: (studentType, payload) =>
    request(`/api/typing/game/settings/${studentType}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  subscribeTypingSettings: (
    studentType,
    { onSettings, onError, effective = false } = {}
  ) => {
    if (typeof EventSource === "undefined") {
      return { close: () => {} };
    }

    const params = new URLSearchParams({ studentType });
    if (effective) params.set("effective", "1");
    const source = new EventSource(
      `/api/typing/settings/events?${params.toString()}`,
      {
        withCredentials: true,
      }
    );

    const handleSettings = (event) => {
      try {
        const data = JSON.parse(event.data || "{}");
        if (data.settings) onSettings?.(data.settings);
      } catch (error) {
        onError?.(error);
      }
    };

    source.addEventListener("typing-settings", handleSettings);
    source.onerror = (error) => onError?.(error);

    return {
      close: () => {
        source.removeEventListener("typing-settings", handleSettings);
        source.close();
      },
    };
  },
  subscribeTypingGameSettings: (
    studentType,
    { onSettings, onError, effective = false } = {}
  ) => {
    if (typeof EventSource === "undefined") {
      return { close: () => {} };
    }

    const params = new URLSearchParams({ studentType });
    if (effective) params.set("effective", "1");
    const source = new EventSource(
      `/api/typing/game/settings/events?${params.toString()}`,
      {
        withCredentials: true,
      }
    );

    const handleSettings = (event) => {
      try {
        const data = JSON.parse(event.data || "{}");
        if (data.settings) onSettings?.(data.settings);
      } catch (error) {
        onError?.(error);
      }
    };

    source.addEventListener("typing-game-settings", handleSettings);
    source.onerror = (error) => onError?.(error);

    return {
      close: () => {
        source.removeEventListener("typing-game-settings", handleSettings);
        source.close();
      },
    };
  },
  getTypingDifficulty: ({ mode, scope = "type", studentType, turmaId, studentId } = {}) => {
    const params = new URLSearchParams({ mode, scope });
    if (studentType) params.set("studentType", studentType);
    if (turmaId) params.set("turmaId", turmaId);
    if (studentId) params.set("studentId", studentId);
    return request(`/api/typing/difficulty?${params.toString()}`);
  },
  saveTypingDifficulty: (payload) =>
    request("/api/typing/difficulty", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  clearTypingDifficulty: (payload) =>
    request("/api/typing/difficulty", {
      method: "DELETE",
      body: JSON.stringify(payload),
    }),
  subscribeNotifications: ({ onNotification, onError } = {}) => {
    if (typeof EventSource === "undefined") {
      return { close: () => {} };
    }

    const source = new EventSource("/api/notifications/events", {
      withCredentials: true,
    });

    const handleNotification = (event) => {
      try {
        const data = JSON.parse(event.data || "{}");
        if (data.notification) onNotification?.(data.notification);
      } catch (error) {
        onError?.(error);
      }
    };

    source.addEventListener("user-notification", handleNotification);
    source.onerror = (error) => onError?.(error);

    return {
      close: () => {
        source.removeEventListener("user-notification", handleNotification);
        source.close();
      },
    };
  },
  // --- PVP ---
  getTypingPvpLobby: ({ turmaId } = {}) => {
    const params = new URLSearchParams();
    if (turmaId) params.set("turmaId", turmaId);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request(`/api/typing-pvp/lobby${suffix}`);
  },
  challengePvpPlayer: (targetId) =>
    request("/api/typing-pvp/challenge", {
      method: "POST",
      body: JSON.stringify({ targetId }),
    }),
  acceptPvpChallenge: (challengerId) =>
    request("/api/typing-pvp/accept", {
      method: "POST",
      body: JSON.stringify({ challengerId }),
    }),
  rejectPvpChallenge: (challengerId) =>
    request("/api/typing-pvp/reject", {
      method: "POST",
      body: JSON.stringify({ challengerId }),
    }),
  joinPvpRandom: () =>
    request("/api/typing-pvp/random", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  cancelPvpRandom: () =>
    request("/api/typing-pvp/cancel-random", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  syncPvpState: (state) =>
    request("/api/typing-pvp/sync", {
      method: "POST",
      body: JSON.stringify({ state }),
    }),
  leavePvp: () =>
    request("/api/typing-pvp/leave", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  winPvpMatch: (payload) =>
    request("/api/typing-pvp/win", {
      method: "POST",
      body: JSON.stringify(payload || {}),
    }),
  losePvpMatch: (payload) =>
    request("/api/typing-pvp/lose", {
      method: "POST",
      body: JSON.stringify(payload || {}),
    }),
  getPvpScores: ({ scope = "turma", turmaId } = {}) => {
    const params = new URLSearchParams({ scope });
    if (turmaId) params.set("turmaId", turmaId);
    return request(`/api/typing-pvp/scores?${params.toString()}`);
  },
  // --- Gestor ---
  getGestorSessions: () => request("/api/gestor/sessions"),
  logoutGestorSessions: (payload) =>
    request("/api/gestor/sessions/logout", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getOuroModernoConfig: () => request("/api/gestor/ouro-moderno"),
  saveOuroModernoConfig: (url) =>
    request("/api/gestor/ouro-moderno", {
      method: "PUT",
      body: JSON.stringify({ url }),
    }),
  // --- Lições ---
  getLessons: (turmaId) => {
    const params = turmaId ? `?turmaId=${encodeURIComponent(turmaId)}` : "";
    return request(`/api/lessons${params}`);
  },
  createLesson: (payload) =>
    request("/api/lessons", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateLesson: (id, payload) =>
    request(`/api/lessons/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteLesson: (id) =>
    request(`/api/lessons/${id}`, {
      method: "DELETE",
    }),
  saveLessonProgress: (id, completed) =>
    request(`/api/lessons/${id}/progress`, {
      method: "PUT",
      body: JSON.stringify({ completed }),
    }),
  getLessonGroups: (turmaId) =>
    request(`/api/lessons/groups?turmaId=${encodeURIComponent(turmaId)}`),
  createLessonGroup: (payload) =>
    request("/api/lessons/groups", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateLessonGroup: (id, payload) =>
    request(`/api/lessons/groups/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteLessonGroup: (id) =>
    request(`/api/lessons/groups/${id}`, {
      method: "DELETE",
    }),
  // --- Desenho da turma ---
  getDrawingActive: () => request("/api/drawing/active"),
  getMyDrawings: () => request("/api/drawing/my-drawings"),
  getDrawingActivities: ({ turmaId, status, mode } = {}) => {
    const params = new URLSearchParams();
    if (turmaId) params.set("turmaId", turmaId);
    if (status) params.set("status", status);
    if (mode) params.set("mode", mode);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request(`/api/drawing/activities${suffix}`);
  },
  createDrawingActivity: (payload) =>
    request("/api/drawing/activities", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getDrawingActivity: (id) => request(`/api/drawing/activities/${id}`),
  saveDrawingStrokes: (id, payload) =>
    request(`/api/drawing/activities/${id}/strokes`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  closeDrawingActivity: (id) =>
    request(`/api/drawing/activities/${id}/close`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  chooseDrawingWinner: (id, winnerId) =>
    request(`/api/drawing/activities/${id}/winner`, {
      method: "POST",
      body: JSON.stringify({ winnerId }),
    }),
  subscribeDrawing: (id, { onEvent, onError } = {}) => {
    if (typeof EventSource === "undefined") return { close: () => {} };
    const source = new EventSource(`/api/drawing/activities/${id}/events`, {
      withCredentials: true,
    });
    const handleEvent = (event) => {
      try {
        onEvent?.(JSON.parse(event.data || "{}"));
      } catch (err) {
        onError?.(err);
      }
    };
    source.addEventListener("drawing", handleEvent);
    source.onerror = (err) => onError?.(err);
    return {
      close: () => {
        source.removeEventListener("drawing", handleEvent);
        source.close();
      },
    };
  },
  // --- Montagem de PC ---
  getPcBuilds: () => request("/api/pc-builder/builds"),
  getPcBuild: (id) => request(`/api/pc-builder/builds/${id}`),
  savePcBuild: (payload) =>
    request("/api/pc-builder/builds", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deletePcBuild: (id) =>
    request(`/api/pc-builder/builds/${id}`, {
      method: "DELETE",
    }),
  // --- Frequência ---
  getMyAttendance: () => request("/api/attendance/me"),
  getAttendanceSummary: ({ startDate, endDate, turmaId } = {}) => {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (turmaId) params.set("turmaId", turmaId);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request(`/api/attendance/summary${suffix}`);
  },
  saveAttendance: (payload) =>
    request("/api/attendance/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  // --- Apostilas ---
  getBookletModules: () => request("/api/booklets/modules"),
  saveBookletAccess: (enabledModuleIds) =>
    request("/api/booklets/modules/access", {
      method: "PUT",
      body: JSON.stringify({ enabledModuleIds }),
    }),
  getBookletStudentAccess: ({ turmaId } = {}) => {
    const params = new URLSearchParams();
    if (turmaId) params.set("turmaId", turmaId);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request(`/api/booklets/student-access${suffix}`);
  },
  saveBookletStudentAccess: (payload) =>
    request("/api/booklets/student-access", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  // --- Avaliação (Exams) ---
  getExams: () => request("/api/exams"),
  getExamDetails: (id) => request(`/api/exams/${id}`),
  createExam: (payload) =>
    request("/api/exams", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateExam: (id, payload) =>
    request(`/api/exams/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteExam: (id) =>
    request(`/api/exams/${id}`, {
      method: "DELETE",
    }),
  publishExam: (id, isPublished) =>
    request(`/api/exams/${id}/publish`, {
      method: "PATCH",
      body: JSON.stringify({ isPublished }),
    }),
  assignExamBatch: (payload) =>
    request("/api/exams/assign-batch", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  addExamQuestion: (id, payload) =>
    request(`/api/exams/${id}/questions`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateExamQuestion: (examId, questionId, payload) =>
    request(`/api/exams/${examId}/questions/${questionId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteExamQuestion: (examId, questionId) =>
    request(`/api/exams/${examId}/questions/${questionId}`, {
      method: "DELETE",
    }),
  submitExam: (id, payload) =>
    request(`/api/exams/${id}/submit`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getExamSubmissions: (id, turmaId) => {
    const params = turmaId ? `?turmaId=${turmaId}` : "";
    return request(`/api/exams/${id}/submissions${params}`);
  },
  getSubmissionDetails: (examId, submissionId) =>
    request(`/api/exams/${examId}/submissions/${submissionId}`),
  getExamAnalytics: (turmaId) => {
    const params = turmaId ? `?turmaId=${turmaId}` : "";
    return request(`/api/exams/analytics${params}`);
  },
  getExamApplications: (turmaId) => {
    const params = turmaId ? `?turmaId=${turmaId}` : "";
    return request(`/api/exams/applications${params}`);
  },
  deleteExamApplication: (id, payload = {}) =>
    request(`/api/exams/applications/${id}`, {
      method: "DELETE",
      body: JSON.stringify(payload),
    }),
  getStudentHistory: () => request("/api/exams/student/history"),
  get: (url) => request(url), // Atalho genérico
  // --- Configurações do Usuário ---
  getUserConfig: () => request("/api/user/config"),
  saveUserConfig: (config) =>
    request("/api/user/config", {
      method: "PUT",
      body: JSON.stringify({ config }),
    }),
  // --- Geração de Imagens ---
  getImageGenConfig: () => request("/api/imagegen/config"),
  generateImage: (payload) =>
    request("/api/imagegen/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  // --- WindQuiz Arena ---
  getQuizQuizzes: () => request("/api/quiz/quizzes"),
  getQuizDetails: (id) => request(`/api/quiz/quizzes/${id}`),
  createQuiz: (payload) =>
    request("/api/quiz/quizzes", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createQuizSession: (payload) =>
    request("/api/quiz/sessions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getActiveQuizSession: () => request("/api/quiz/sessions/active"),
  advanceQuizSession: (id, action) =>
    request(`/api/quiz/sessions/${id}/advance`, {
      method: "POST",
      body: JSON.stringify({ action }),
    }),
  submitQuizAnswer: (id, selectedOptionId) =>
    request(`/api/quiz/sessions/${id}/answer`, {
      method: "POST",
      body: JSON.stringify({ selectedOptionId }),
    }),
  getQuizRankings: (turmaId) => {
    const query = turmaId ? `?turmaId=${turmaId}` : "";
    return request(`/api/quiz/rankings${query}`);
  },
};
