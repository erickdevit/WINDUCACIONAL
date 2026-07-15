import React, { useEffect, useMemo, useState } from "react";

const toDateTimeInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export const LessonEditor = ({
  lesson,
  groups,
  saving,
  onCancel,
  onSubmit,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activityType, setActivityType] = useState("solo");
  const [dueAt, setDueAt] = useState("");
  const [groupIds, setGroupIds] = useState([]);

  useEffect(() => {
    setTitle(lesson?.title || "");
    setDescription(lesson?.description || "");
    setActivityType(lesson?.activityType || "solo");
    setDueAt(toDateTimeInput(lesson?.dueAt));
    setGroupIds((lesson?.groups || []).map((group) => group.id));
  }, [lesson]);

  const selectedGroups = useMemo(() => new Set(groupIds), [groupIds]);

  const toggleGroup = (groupId) => {
    setGroupIds((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId]
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      activityType,
      dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      groupIds: activityType === "group" ? groupIds : [],
    });
  };

  return (
    <section className="lessonEditorPanel">
      <div className="lessonPanelHeading">
        <div>
          <span className="lessonEyebrow">Atividade</span>
          <h2>{lesson ? "Editar lição" : "Nova lição"}</h2>
        </div>
        <button type="button" className="lessonTextButton" onClick={onCancel}>
          Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <label>
          <span>Título</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={160}
            placeholder="Ex.: Pesquisar a história da internet"
            autoFocus
            required
          />
        </label>

        <label>
          <span>Orientações</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={4000}
            rows={5}
            placeholder="Descreva o que a turma deve fazer."
          />
        </label>

        <div className="lessonFormGrid">
          <fieldset>
            <legend>Formato</legend>
            <label className="lessonChoice">
              <input
                type="radio"
                name="activityType"
                value="solo"
                checked={activityType === "solo"}
                onChange={() => setActivityType("solo")}
              />
              <span>
                <strong>Individual</strong>
                <small>Toda a turma recebe a tarefa.</small>
              </span>
            </label>
            <label className="lessonChoice">
              <input
                type="radio"
                name="activityType"
                value="group"
                checked={activityType === "group"}
                onChange={() => setActivityType("group")}
              />
              <span>
                <strong>Em grupo</strong>
                <small>Somente os grupos selecionados recebem.</small>
              </span>
            </label>
          </fieldset>

          <label>
            <span>Prazo opcional</span>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
            />
          </label>
        </div>

        {activityType === "group" && (
          <fieldset className="lessonGroupPicker">
            <legend>Grupos que receberão a atividade</legend>
            {groups.length === 0 ? (
              <p>
                Crie ao menos um grupo na opção “Grupos” antes de salvar uma
                atividade em grupo.
              </p>
            ) : (
              <div>
                {groups.map((group) => (
                  <label key={group.id}>
                    <input
                      type="checkbox"
                      checked={selectedGroups.has(group.id)}
                      onChange={() => toggleGroup(group.id)}
                    />
                    <span>
                      {group.name}
                      <small>
                        {group.members.length} aluno
                        {group.members.length === 1 ? "" : "s"}
                      </small>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        )}

        <div className="lessonFormActions">
          <button
            type="button"
            className="lessonSecondaryButton"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="lessonPrimaryButton"
            disabled={
              saving ||
              !title.trim() ||
              (activityType === "group" && groupIds.length === 0)
            }
          >
            {saving
              ? "Salvando..."
              : lesson
              ? "Salvar alterações"
              : "Criar lição"}
          </button>
        </div>
      </form>
    </section>
  );
};
