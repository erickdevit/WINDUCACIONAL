import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";
import { getStudentTypeLabel } from "../../../../lib/ui";
import { Icon } from "../../../../utils/general";
import {
  AppLikeDialog,
  defaultScheduleDays,
  getEmptyTurmaForm,
  getScheduleSummary,
  normalizeScheduleDays,
  studentTypeOptions,
  weekDayOptions,
} from "./settingsShared";

export const TurmaManagement = ({ currentUser, onBack }) => {
  const [view, setView] = useState("list"); // "list", "create", "details"
  const [turmas, setTurmas] = useState([]);
  const [users, setUsers] = useState([]);
  const [createForm, setCreateForm] = useState(getEmptyTurmaForm);
  const [editForm, setEditForm] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const isProfessor = currentUser.role === "professor";
  const isStaff = currentUser.role !== "aluno";

  const loadData = async () => {
    if (!isStaff) return;
    setLoadingData(true);
    try {
      const turmasRes = await api.getTurmas();
      setTurmas(turmasRes.turmas || []);
      const usersRes = await api.getUsers();
      setUsers(usersRes.users || []);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isStaff]);

  const viewDetails = (turma) => {
    setSelectedId(turma.id);
    setEditForm({
      nome: turma.nome,
      code: turma.code || "",
      studentType: turma.studentType || "normal",
      scheduleDays: normalizeScheduleDays(turma.scheduleDays),
      scheduleStartTime: turma.scheduleStartTime || "00:00",
      scheduleEndTime: turma.scheduleEndTime || "23:59",
      descricao: turma.descricao || "",
      active: turma.active,
    });
    setView("details");
    setMessage("");
  };

  const updateCreateField = (e) => {
    setCreateForm({ ...createForm, [e.target.name]: e.target.value });
  };

  const updateEditField = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm({
      ...editForm,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const updateCreateScheduleDay = (day, checked) => {
    setCreateForm((form) => ({
      ...form,
      scheduleDays: checked
        ? normalizeScheduleDays([...form.scheduleDays, day])
        : form.scheduleDays.filter((item) => item !== day),
    }));
  };

  const updateEditScheduleDay = (day, checked) => {
    setEditForm((form) => ({
      ...form,
      scheduleDays: checked
        ? normalizeScheduleDays([...form.scheduleDays, day])
        : form.scheduleDays.filter((item) => item !== day),
    }));
  };

  const renderScheduleFields = (form, onFieldChange, onDayChange) => (
    <fieldset className="turmaScheduleFields">
      <legend>Dias e horários de aula</legend>
      <p>
        A Frequência usa esta agenda para calcular presenças e ausências da
        turma.
      </p>
      <div className="turmaWeekDays">
        {weekDayOptions.map((day) => (
          <label key={day.value}>
            <input
              type="checkbox"
              checked={(Array.isArray(form.scheduleDays)
                ? form.scheduleDays
                : defaultScheduleDays
              ).includes(day.value)}
              onChange={(event) => onDayChange(day.value, event.target.checked)}
            />
            <span>{day.label}</span>
          </label>
        ))}
      </div>
      <div className="turmaTimeGrid">
        <label>
          Início
          <input
            name="scheduleStartTime"
            type="time"
            value={form.scheduleStartTime}
            onChange={onFieldChange}
            required
          />
        </label>
        <label>
          Fim
          <input
            name="scheduleEndTime"
            type="time"
            value={form.scheduleEndTime}
            onChange={onFieldChange}
            required
          />
        </label>
      </div>
    </fieldset>
  );

  const submitCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await api.createTurma(createForm);
      setCreateForm(getEmptyTurmaForm());
      await loadData();
      setView("list");
      setMessage("Turma criada com sucesso.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!selectedId) return;
    setSaving(true);
    setMessage("");
    try {
      await api.updateTurma(selectedId, editForm);
      await loadData();
      setView("list");
      setMessage("Turma atualizada com sucesso.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (turmaId) => {
    const turma = turmas.find((t) => t.id === turmaId);
    if (!turma) return;
    if (
      !confirm(
        `Excluir a turma "${turma.nome}"? Os alunos vinculados ficarão sem turma.`
      )
    )
      return;
    setSaving(true);
    try {
      await api.deleteTurma(turmaId);
      if (selectedId === turmaId) {
        setView("list");
      }
      await loadData();
      setMessage("Turma excluída com sucesso.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isStaff) {
    return (
      <section className="userAdminPanel turmaManagementPanel win11Scroll">
        <div className="userAdminTopBar">
          <button type="button" className="secondaryBtn" onClick={onBack}>
            Voltar
          </button>
        </div>
        <div className="userAdminCard">
          <h2>Turmas</h2>
          <p>Apenas professores podem gerenciar turmas.</p>
        </div>
      </section>
    );
  }

  const selectedTurma = turmas.find((t) => t.id === selectedId);
  const turmaUsers = users.filter((u) => u.turmaId === selectedId);

  return (
    <section className="userAdminPanel turmaManagementPanel win11Scroll">
      <div className="userAdminTopBar">
        <button type="button" className="secondaryBtn" onClick={onBack}>
          <Icon fafa="faArrowLeft" width={12} />
          Voltar
        </button>
      </div>

      <div className="userAdminHero">
        <div>
          <h2>Gerenciar turmas</h2>
          <p>
            Selecione uma turma para ver seus alunos, tipo, código e detalhes.
          </p>
        </div>
      </div>
      {message && view === "list" ? (
        <p className="userAdminMessage">{message}</p>
      ) : null}
      {isProfessor ? (
        <div className="userAddRow">
          <div className="userAddInfo">
            <Icon fafa="faUserPlus" width={18} />
            <div>
              <strong>Criar nova turma</strong>
              <span>
                Um código automático de 6 caracteres será usado no cadastro do
                aluno.
              </span>
            </div>
          </div>
          <div className="userAddActions">
            <button
              type="button"
              onClick={() => {
                setCreateForm(getEmptyTurmaForm());
                setView("create");
                setMessage("");
              }}
            >
              Criar turma
            </button>
          </div>
        </div>
      ) : null}
      <div
        className="userAdminCard turmaListCard"
        style={{ marginTop: "14px" }}
      >
        <div className="turmaList">
          {loadingData && turmas.length === 0 ? (
            <p>Carregando turmas...</p>
          ) : turmas.length === 0 ? (
            <p>Nenhuma turma cadastrada. Clique no botão acima para criar.</p>
          ) : (
            turmas.map((turma) => (
              <div
                key={turma.id}
                className="turmaRow"
                onClick={() => viewDetails(turma)}
              >
                <div className="turmaRowInfo">
                  <strong>{turma.nome}</strong>
                  {turma.descricao ? <span>{turma.descricao}</span> : null}
                  <span>{getScheduleSummary(turma)}</span>
                </div>
                <div className="turmaRowActions">
                  <span className="turmaCodeBadge">
                    {turma.code || "------"}
                  </span>
                  <span className="turmaCodeBadge">
                    {getStudentTypeLabel(turma.studentType)}
                  </span>
                  <span
                    className={turma.active ? "turmaActive" : "turmaInactive"}
                  >
                    {turma.active ? "Ativa" : "Inativa"}
                  </span>
                  {isProfessor ? (
                    <button
                      type="button"
                      className="turmaDeleteBtn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(turma.id);
                      }}
                      title="Excluir turma"
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {view === "create" ? (
        <AppLikeDialog
          title="Criar turma"
          icon="settings"
          onClose={() => {
            setView("list");
            setMessage("");
          }}
          actions={
            <>
              <button
                type="submit"
                form="create-turma-form"
                className="primaryDialogBtn"
                disabled={saving}
              >
                Salvar turma
              </button>
              <button
                type="button"
                className="secondaryDialogBtn"
                onClick={() => {
                  setView("list");
                  setMessage("");
                }}
              >
                Cancelar
              </button>
            </>
          }
        >
          <form
            id="create-turma-form"
            className="userDialogForm turmaCreateCard"
            onSubmit={submitCreate}
          >
            <h3>Criar turma</h3>
            <p>
              Use o código automático para vincular alunos. O tipo da turma
              define se todos serão Normal ou Kids.
            </p>
            {message ? <p className="userDialogMessage">{message}</p> : null}
            <label>
              Nome da turma
              <input
                name="nome"
                value={createForm.nome}
                onChange={updateCreateField}
                placeholder="Ex: 1A - Manhã"
                minLength={2}
                required
              />
            </label>
            <label>
              Código da turma
              <input
                name="code"
                value={createForm.code}
                readOnly
                maxLength={6}
              />
            </label>
            <label>
              Tipo da turma
              <select
                name="studentType"
                value={createForm.studentType}
                onChange={updateCreateField}
              >
                {studentTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.title}
                  </option>
                ))}
              </select>
            </label>
            {renderScheduleFields(
              createForm,
              updateCreateField,
              updateCreateScheduleDay
            )}
            <label>
              Descrição (opcional)
              <input
                name="descricao"
                value={createForm.descricao}
                onChange={updateCreateField}
                placeholder="Ex: Turma do 1º ano, período matutino"
              />
            </label>
          </form>
        </AppLikeDialog>
      ) : null}

      {view === "details" && selectedTurma && editForm ? (
        <AppLikeDialog
          title={`Turma ${selectedTurma.nome}`}
          icon="settings"
          onClose={() => {
            setView("list");
            setMessage("");
          }}
          defaultWidth={760}
          defaultHeight={620}
          actions={
            <>
              {isProfessor ? (
                <button
                  type="submit"
                  form="edit-turma-form"
                  className="primaryDialogBtn"
                  disabled={saving}
                >
                  Salvar alterações
                </button>
              ) : null}
              <button
                type="button"
                className="secondaryDialogBtn"
                onClick={() => {
                  setView("list");
                  setMessage("");
                }}
              >
                Voltar
              </button>
            </>
          }
        >
          <div className="turmaDialogGrid">
            <section>
              <h3>Alunos em {selectedTurma.nome}</h3>
              <p className="turmaCodeLarge">
                Código: {selectedTurma.code || "------"}
              </p>
              <p className="turmaCodeLarge">
                Tipo: {getStudentTypeLabel(selectedTurma.studentType)}
              </p>
              <p className="turmaCodeLarge">
                Aulas: {getScheduleSummary(selectedTurma)}
              </p>
              {message ? <p className="userDialogMessage">{message}</p> : null}
              <div className="turmaStudentList">
                {turmaUsers.length === 0 ? (
                  <p>Nenhum aluno vinculado a esta turma no momento.</p>
                ) : (
                  turmaUsers.map((u) => (
                    <div key={u.id} className="turmaStudentRow">
                      <div>
                        <strong>{u.displayName}</strong>
                        <span>@{u.username}</span>
                        <span>{getStudentTypeLabel(u.studentType)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {isProfessor ? (
              <form
                id="edit-turma-form"
                className="userDialogForm turmaEditCard"
                onSubmit={submitEdit}
              >
                <h3>Editar turma</h3>
                <label>
                  Nome da turma
                  <input
                    name="nome"
                    value={editForm.nome}
                    onChange={updateEditField}
                    minLength={2}
                    autoFocus
                    required
                  />
                </label>
                <label>
                  Código da turma
                  <input
                    name="code"
                    value={editForm.code}
                    readOnly
                    maxLength={6}
                  />
                </label>
                <label>
                  Tipo da turma
                  <select
                    name="studentType"
                    value={editForm.studentType}
                    onChange={updateEditField}
                  >
                    {studentTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.title}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="formHint">
                  Ao alterar o tipo da turma, todos os alunos vinculados herdam
                  o novo tipo automaticamente.
                </p>
                {renderScheduleFields(
                  editForm,
                  updateEditField,
                  updateEditScheduleDay
                )}
                <label>
                  Descrição
                  <input
                    name="descricao"
                    value={editForm.descricao}
                    onChange={updateEditField}
                  />
                </label>
                <label className="toggleRow">
                  <input
                    name="active"
                    type="checkbox"
                    checked={editForm.active}
                    onChange={updateEditField}
                  />
                  <span>Turma ativa</span>
                </label>
              </form>
            ) : null}
          </div>
        </AppLikeDialog>
      ) : null}
    </section>
  );
};
