import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { AppWindow } from "../../../../components/shared/AppWindow";
import { api } from "../../../../lib/api";
import { GroupEditor } from "./GroupEditor";
import { LessonEditor } from "./LessonEditor";
import "./lessons.scss";

const formatDueAt = (value) => {
  if (!value) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
};

const LessonBadge = ({ lesson }) => (
  <span className={`lessonTypeBadge ${lesson.activityType}`}>
    {lesson.activityType === "group" ? "Em grupo" : "Individual"}
  </span>
);

export const Lessons = () => {
  const wnapp = useSelector((state) => state.apps.lessons);
  const user = useSelector((state) => state.setting.person);
  const isProfessor = user.role === "professor";
  const isStaff = user.role !== "aluno";
  const [turmas, setTurmas] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState("");
  const [lessons, setLessons] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeTab, setActiveTab] = useState("lessons");
  const [studentFilter, setStudentFilter] = useState("pending");
  const [editingLesson, setEditingLesson] = useState(undefined);
  const [editingGroup, setEditingGroup] = useState(undefined);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadStudentLessons = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.getLessons();
      setLessons(result.lessons || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  const loadProfessorBootstrap = async () => {
    setLoading(true);
    setError("");
    try {
      const [turmasResult, usersResult] = await Promise.all([
        api.getTurmas(),
        api.getUsers(),
      ]);
      const availableTurmas = turmasResult.turmas || [];
      setTurmas(availableTurmas);
      setUsers(usersResult.users || []);
      setSelectedTurmaId((current) =>
        availableTurmas.some((turma) => turma.id === current)
          ? current
          : availableTurmas[0]?.id || ""
      );
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTurmaContent = async (turmaId) => {
    if (!turmaId) {
      setLessons([]);
      setGroups([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [lessonsResult, groupsResult] = await Promise.all([
        api.getLessons(turmaId),
        api.getLessonGroups(turmaId),
      ]);
      setLessons(lessonsResult.lessons || []);
      setGroups(groupsResult.groups || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (wnapp?.hide) return;
    if (isStaff) loadProfessorBootstrap();
    else loadStudentLessons();
  }, [wnapp?.hide, isStaff]);

  useEffect(() => {
    if (!wnapp?.hide && isStaff && selectedTurmaId) {
      setEditingLesson(undefined);
      setEditingGroup(undefined);
      loadTurmaContent(selectedTurmaId);
    }
  }, [selectedTurmaId, wnapp?.hide, isStaff]);

  const turmaStudents = useMemo(
    () =>
      users.filter(
        (candidate) =>
          candidate.role === "aluno" && candidate.turmaId === selectedTurmaId
      ),
    [users, selectedTurmaId]
  );

  const visibleStudentLessons = lessons.filter((lesson) => {
    if (studentFilter === "all") return true;
    if (studentFilter === "completed") return lesson.completed;
    return !lesson.completed;
  });

  const handleSaveLesson = async (payload) => {
    setSaving(true);
    setError("");
    try {
      if (editingLesson?.id) {
        await api.updateLesson(editingLesson.id, payload);
      } else {
        await api.createLesson({ ...payload, turmaId: selectedTurmaId });
      }
      setEditingLesson(undefined);
      await loadTurmaContent(selectedTurmaId);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLesson = async (lesson) => {
    if (!window.confirm(`Excluir a atividade “${lesson.title}”?`)) return;
    setSaving(true);
    setError("");
    try {
      await api.deleteLesson(lesson.id);
      await loadTurmaContent(selectedTurmaId);
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGroup = async (payload) => {
    setSaving(true);
    setError("");
    try {
      if (editingGroup?.id) {
        await api.updateLessonGroup(editingGroup.id, payload);
      } else {
        await api.createLessonGroup({ ...payload, turmaId: selectedTurmaId });
      }
      setEditingGroup(undefined);
      await loadTurmaContent(selectedTurmaId);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (group) => {
    if (
      !window.confirm(
        `Excluir o grupo “${group.name}”? Atividades existentes deixarão de apontar para ele.`
      )
    ) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.deleteLessonGroup(group.id);
      await loadTurmaContent(selectedTurmaId);
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleProgress = async (lesson) => {
    setSaving(true);
    setError("");
    try {
      const result = await api.saveLessonProgress(lesson.id, !lesson.completed);
      setLessons((current) =>
        current.map((item) =>
          item.id === lesson.id
            ? {
                ...item,
                completed: result.progress.completed,
                completedAt: result.progress.completedAt,
              }
            : item
        )
      );
    } catch (progressError) {
      setError(progressError.message);
    } finally {
      setSaving(false);
    }
  };

  if (!wnapp) return null;

  return (
    <AppWindow
      wnapp={wnapp}
      app={wnapp.action}
      icon={wnapp.icon}
      name="Lições"
      className="lessonsApp lightWindow"
      windowScreenClassName="flex flex-col"
      restWindowClassName="flex-grow flex flex-col"
    >
      <div className="lessonsWorkspace win11Scroll">
        <main className="lessonsMain">
          <header className="lessonsHeader">
            <div>
              <span className="lessonEyebrow">
                {isStaff ? "Planejamento da turma" : "Tarefas da turma"}
              </span>
              <h1>Lições</h1>
              <p>
                {isStaff
                  ? "Organize atividades individuais e em grupo, sem notas."
                  : "Consulte as orientações do professor e acompanhe suas tarefas."}
              </p>
            </div>

            {isStaff && (
              <div className="lessonsHeaderActions">
                <label>
                  <span>Turma</span>
                  <select
                    value={selectedTurmaId}
                    onChange={(event) => setSelectedTurmaId(event.target.value)}
                  >
                    {turmas.map((turma) => (
                      <option key={turma.id} value={turma.id}>
                        {turma.nome}
                      </option>
                    ))}
                  </select>
                </label>
                {isProfessor && (
                  <button
                    type="button"
                    className="lessonPrimaryButton"
                    disabled={!selectedTurmaId}
                    onClick={() =>
                      activeTab === "lessons"
                        ? setEditingLesson(null)
                        : setEditingGroup(null)
                    }
                  >
                    {activeTab === "lessons" ? "Nova lição" : "Novo grupo"}
                  </button>
                )}
              </div>
            )}
          </header>

          {error && (
            <div className="lessonsAlert" role="alert">
              {error}
            </div>
          )}

          {isStaff ? (
            <>
              <nav className="lessonsTabs" aria-label="Seções de Lições">
                <button
                  type="button"
                  className={activeTab === "lessons" ? "active" : ""}
                  onClick={() => {
                    setActiveTab("lessons");
                    setEditingGroup(undefined);
                  }}
                >
                  Atividades
                  <span>{lessons.length}</span>
                </button>
                <button
                  type="button"
                  className={activeTab === "groups" ? "active" : ""}
                  onClick={() => {
                    setActiveTab("groups");
                    setEditingLesson(undefined);
                  }}
                >
                  Grupos
                  <span>{groups.length}</span>
                </button>
              </nav>

              {activeTab === "lessons" ? (
                editingLesson !== undefined ? (
                  <LessonEditor
                    lesson={editingLesson}
                    groups={groups}
                    saving={saving}
                    onCancel={() => setEditingLesson(undefined)}
                    onSubmit={handleSaveLesson}
                  />
                ) : (
                  <section className="lessonCardList">
                    {lessons.map((lesson) => (
                      <article key={lesson.id} className="lessonCard teacher">
                        <div className="lessonCardStatus">
                          <span className="lessonCheckVisual" />
                        </div>
                        <div className="lessonCardContent">
                          <div className="lessonCardTopline">
                            <LessonBadge lesson={lesson} />
                            <span className="lessonDueDate">
                              {formatDueAt(lesson.dueAt)}
                            </span>
                          </div>
                          <h2>{lesson.title}</h2>
                          {lesson.description && <p>{lesson.description}</p>}
                          {lesson.activityType === "group" && (
                            <div className="lessonGroupTags">
                              {lesson.groups.map((group) => (
                                <span key={group.id}>{group.name}</span>
                              ))}
                            </div>
                          )}
                          <div className="lessonProgressSummary">
                            <span>
                              {lesson.completedCount} de {lesson.eligibleCount}{" "}
                              concluíram
                            </span>
                            <div>
                              <i
                                style={{
                                  width: `${
                                    lesson.eligibleCount
                                      ? Math.round(
                                          (lesson.completedCount /
                                            lesson.eligibleCount) *
                                            100
                                        )
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        {isProfessor && (
                          <div className="lessonCardActions">
                            <button
                              type="button"
                              onClick={() => setEditingLesson(lesson)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="danger"
                              onClick={() => handleDeleteLesson(lesson)}
                            >
                              Excluir
                            </button>
                          </div>
                        )}
                      </article>
                    ))}
                    {!loading && lessons.length === 0 && (
                      <div className="lessonsEmptyState">
                        <strong>Nenhuma lição nesta turma.</strong>
                        <span>Crie uma tarefa individual ou em grupo.</span>
                      </div>
                    )}
                  </section>
                )
              ) : editingGroup !== undefined ? (
                <GroupEditor
                  group={editingGroup}
                  students={turmaStudents}
                  saving={saving}
                  onCancel={() => setEditingGroup(undefined)}
                  onSubmit={handleSaveGroup}
                />
              ) : (
                <section className="groupCardGrid">
                  {groups.map((group) => (
                    <article key={group.id} className="groupCard">
                      <div className="groupCardHeading">
                        <div>
                          <span className="groupAvatar">
                            {group.name.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <h2>{group.name}</h2>
                            <p>
                              {group.members.length} membro
                              {group.members.length === 1 ? "" : "s"}
                            </p>
                          </div>
                        </div>
                        {isProfessor && (
                          <div className="lessonCardActions">
                            <button
                              type="button"
                              onClick={() => setEditingGroup(group)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="danger"
                              onClick={() => handleDeleteGroup(group)}
                            >
                              Excluir
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="groupMemberList">
                        {group.members.map((member) => (
                          <span key={member.id}>{member.displayName}</span>
                        ))}
                        {group.members.length === 0 && (
                          <em>Grupo sem alunos.</em>
                        )}
                      </div>
                    </article>
                  ))}
                  {!loading && groups.length === 0 && (
                    <div className="lessonsEmptyState wide">
                      <strong>Nenhum grupo nesta turma.</strong>
                      <span>
                        Crie grupos e escolha os alunos participantes.
                      </span>
                    </div>
                  )}
                </section>
              )}
            </>
          ) : (
            <>
              <nav
                className="studentLessonFilters"
                aria-label="Filtros de lições"
              >
                {[
                  ["pending", "Pendentes"],
                  ["all", "Todas"],
                  ["completed", "Concluídas"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={studentFilter === value ? "active" : ""}
                    onClick={() => setStudentFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </nav>
              <section className="lessonCardList student">
                {visibleStudentLessons.map((lesson) => (
                  <article
                    key={lesson.id}
                    className={`lessonCard student ${
                      lesson.completed ? "completed" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="lessonCompleteButton"
                      aria-label={
                        lesson.completed
                          ? `Marcar ${lesson.title} como pendente`
                          : `Marcar ${lesson.title} como concluída`
                      }
                      aria-pressed={lesson.completed}
                      disabled={saving}
                      onClick={() => handleProgress(lesson)}
                    >
                      {lesson.completed ? "✓" : ""}
                    </button>
                    <div className="lessonCardContent">
                      <div className="lessonCardTopline">
                        <LessonBadge lesson={lesson} />
                        <span className="lessonDueDate">
                          {formatDueAt(lesson.dueAt)}
                        </span>
                      </div>
                      <h2>{lesson.title}</h2>
                      {lesson.description && <p>{lesson.description}</p>}
                      {lesson.activityType === "group" && (
                        <div className="lessonGroupTags">
                          {lesson.groups.map((group) => (
                            <span key={group.id}>{group.name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
                {!loading && visibleStudentLessons.length === 0 && (
                  <div className="lessonsEmptyState">
                    <strong>
                      {studentFilter === "pending"
                        ? "Nenhuma tarefa pendente."
                        : "Nenhuma lição encontrada."}
                    </strong>
                    <span>
                      As atividades publicadas pelo professor aparecerão aqui.
                    </span>
                  </div>
                )}
              </section>
            </>
          )}

          {loading && (
            <div className="lessonsLoading">Carregando lições...</div>
          )}
        </main>
      </div>
    </AppWindow>
  );
};

export { formatDueAt };
