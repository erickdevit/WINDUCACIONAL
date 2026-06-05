import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useMemo, useState } from "react";
import { UserAvatar } from "../../../../components/user/UserAvatar";
import { api } from "../../../../lib/api";
import {
  getRoleLabel,
  getStudentTypeLabel,
  normalizeName,
} from "../../../../lib/ui";
import { Icon } from "../../../../utils/general";
import {
  AppLikeDialog,
  emptyEditForm,
  getEmptyCreateForm,
  normalizeSearchText,
} from "./settingsShared";

export const UserManagement = ({ currentUser, onBack }) => {
  const [users, setUsers] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [createForm, setCreateForm] = useState(getEmptyCreateForm());
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [createMode, setCreateMode] = useState("");
  const [dialogMode, setDialogMode] = useState("");
  const [message, setMessage] = useState("");
  const [createUsernameStatus, setCreateUsernameStatus] = useState(null);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [turmaFilter, setTurmaFilter] = useState("all");
  const isProfessor = currentUser.role === "professor";
  const isStaff = currentUser.role !== "aluno";

  const selectedUser = users.find((user) => user.id === selectedUserId) || null;
  const turmaNameById = useMemo(
    () => new Map(turmas.map((turma) => [turma.id, turma.nome])),
    [turmas]
  );
  const turmaTypeById = useMemo(
    () =>
      new Map(turmas.map((turma) => [turma.id, turma.studentType || "normal"])),
    [turmas]
  );
  const filteredUsers = useMemo(() => {
    const search = normalizeSearchText(userSearch.trim());

    return users.filter((user) => {
      const matchesSearch =
        !search || normalizeSearchText(user.displayName).includes(search);
      const matchesTurma =
        turmaFilter === "all" ||
        (turmaFilter === "team" && user.role === "professor") ||
        (turmaFilter === "none" && user.role === "aluno" && !user.turmaId) ||
        user.turmaId === turmaFilter;

      return matchesSearch && matchesTurma;
    });
  }, [turmaFilter, userSearch, users]);

  const prepareEditing = (user) => {
    setSelectedUserId(user.id);
    setShowEditPassword(false);
    setEditForm({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      password: "",
      role: user.role,
      studentType: user.studentType || "normal",
      turmaId: user.turmaId || "",
      active: user.active,
    });
  };

  const startEditing = (user) => {
    setCreateMode("");
    setDialogMode("edit");
    setMessage("");
    prepareEditing(user);
  };

  const loadUsers = async () => {
    if (!isStaff) return;
    setLoading(true);
    try {
      const [usersResult, turmasResult] = await Promise.all([
        api.getUsers(),
        api.getTurmas().catch(() => ({ turmas: [] })),
      ]);
      const loadedUsers = usersResult.users || [];
      setUsers(loadedUsers);
      setTurmas(turmasResult.turmas || []);
      setMessage("");
      if (loadedUsers.length > 0) {
        const nextSelection =
          loadedUsers.find((user) => user.id === selectedUserId) ||
          loadedUsers[0];
        prepareEditing(nextSelection);
      } else {
        setSelectedUserId("");
        setEditForm(emptyEditForm);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [isStaff]);

  const openCreateForm = () => {
    setCreateMode("usuario");
    setDialogMode("create");
    setCreateForm(getEmptyCreateForm("aluno"));
    setSelectedUserId("");
    setMessage("");
    setCreateUsernameStatus(null);
    setShowCreatePassword(false);
  };

  const cancelCreate = () => {
    setDialogMode("");
    setCreateMode("");
    setCreateForm(getEmptyCreateForm());
    setCreateUsernameStatus(null);
    setShowCreatePassword(false);
    if (users.length > 0) {
      prepareEditing(users[0]);
    }
  };

  const closeDialog = () => {
    setDialogMode("");
    setCreateMode("");
    setMessage("");
    setShowCreatePassword(false);
    setShowEditPassword(false);
    if (users.length > 0 && !selectedUserId) {
      prepareEditing(users[0]);
    }
  };

  const updateCreateField = (event) => {
    const { name, value } = event.target;
    if (name === "username") setCreateUsernameStatus(null);
    setCreateForm((state) => {
      const nextForm = {
        ...state,
        [name]: name === "displayName" ? normalizeName(value) : value,
      };
      if (name === "turmaId") {
        nextForm.studentType = turmaTypeById.get(value) || "normal";
      }
      return nextForm;
    });
  };

  const checkCreateUsername = async () => {
    const username = createForm.username.trim();
    if (username.length < 3) {
      setCreateUsernameStatus(null);
      return;
    }
    setCreateUsernameStatus({
      type: "checking",
      text: "Verificando usuário...",
    });
    try {
      const result = await api.checkUsernameAvailability(username);
      setCreateUsernameStatus(
        result.available
          ? { type: "ok", text: "Usuário disponível." }
          : { type: "error", text: "Este usuário já está em uso." }
      );
    } catch (error) {
      setCreateUsernameStatus({ type: "error", text: error.message });
    }
  };

  const updateEditField = (event) => {
    const { name, value, type, checked } = event.target;
    const nextForm = {
      ...editForm,
      [name]:
        name === "displayName"
          ? normalizeName(value)
          : type === "checkbox"
          ? checked
          : value,
    };
    if (name === "role" && value === "professor") {
      nextForm.studentType = "normal";
      nextForm.turmaId = "";
    }
    if (name === "turmaId") {
      nextForm.studentType = turmaTypeById.get(value) || "normal";
    }
    setEditForm(nextForm);
  };

  const submitCreate = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      if (createUsernameStatus?.type === "error") {
        setLoading(false);
        return;
      }
      const role = createForm.role;
      await api.createUser({
        username: createForm.username,
        displayName: createForm.displayName,
        password: createForm.password,
        role,
        studentType: role === "aluno" ? createForm.studentType : "normal",
        turmaId: role === "aluno" ? createForm.turmaId || null : null,
      });
      setCreateForm(getEmptyCreateForm(role));
      setCreateMode("");
      setDialogMode("");
      await loadUsers();
      setMessage(
        `${role === "aluno" ? "Aluno" : "Professor"} criado com sucesso.`
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    if (!selectedUser) return;
    setLoading(true);
    setMessage("");
    try {
      const payload = {
        displayName: editForm.displayName,
        role: editForm.role,
        studentType:
          editForm.role === "aluno" ? editForm.studentType : "normal",
        turmaId: editForm.role === "aluno" ? editForm.turmaId || null : null,
        active: editForm.active,
      };
      if (editForm.password) payload.password = editForm.password;
      await api.updateUser(selectedUser.id, payload);
      setDialogMode("");
      await loadUsers();
      setEditForm((state) => ({ ...state, password: "" }));
      setMessage("Usuário atualizado com sucesso.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderTurmaField = (form, onChange) => (
    <label>
      Turma
      <select name="turmaId" value={form.turmaId} onChange={onChange}>
        <option value="">Sem turma</option>
        {turmas
          .filter((t) => t.active)
          .map((turma) => (
            <option key={turma.id} value={turma.id}>
              {turma.nome} ({getStudentTypeLabel(turma.studentType)})
            </option>
          ))}
      </select>
    </label>
  );

  if (!isStaff) {
    return (
      <section className="userAdminPanel">
        <div className="userAdminTopBar">
          <button type="button" className="secondaryBtn" onClick={onBack}>
            Voltar
          </button>
        </div>
        <div className="userAdminCard">
          <h2>Outros usuários</h2>
          <p>
            Apenas professores podem criar ou editar contas. Como aluno, você
            acessa somente o seu próprio disco virtual, e o diretório completo
            `C:\Users` permanece restrito ao professor.
          </p>
        </div>
      </section>
    );
  }

  const professorCount = users.filter(
    (user) => user.role === "professor"
  ).length;
  const studentCount = users.filter((user) => user.role === "aluno").length;

  return (
    <section className="userAdminPanel">
      <div className="userAdminTopBar">
        <button type="button" className="secondaryBtn" onClick={onBack}>
          <Icon fafa="faArrowLeft" width={12} />
          Voltar
        </button>
        <button
          type="button"
          className="secondaryBtn"
          onClick={loadUsers}
          disabled={loading}
        >
          <Icon fafa="faRotate" width={12} />
          Atualizar lista
        </button>
      </div>

      <div className="userAdminHero">
        <div>
          <h2>Gerenciar outros usuários</h2>
          <p>
            Crie contas separadas para alunos e professores, controle o acesso
            ao simulador e mantenha a separação dos discos virtuais.
          </p>
        </div>
        <div className="userAdminStats" aria-label="Resumo de usuários">
          <span>{studentCount} alunos</span>
          <span>{professorCount} professores</span>
        </div>
      </div>

      {message && !dialogMode ? (
        <p className="userAdminMessage">{message}</p>
      ) : null}

      {isProfessor ? (
        <div className="userAddRow">
          <div className="userAddInfo">
            <Icon fafa="faUserPlus" width={18} />
            <div>
              <strong>Adicionar outro usuário</strong>
              <span>
                Escolha uma criação exclusiva para aluno ou professor.
              </span>
            </div>
          </div>
          <div className="userAddActions">
            <button
              type="button"
              className={createMode === "usuario" ? "selected" : ""}
              onClick={() => openCreateForm()}
            >
              <Icon fafa="faUserPlus" width={13} />
              Criar usuário
            </button>
          </div>
        </div>
      ) : null}

      <div className="userAdminGrid">
        <section className="userAdminCard userDirectoryCard">
          <div className="userDirectoryHeader">
            <div>
              <h3>Usuários configurados</h3>
              <span>
                {filteredUsers.length} de {users.length} usuários exibidos
              </span>
            </div>
          </div>
          <div className="userDirectoryToolbar">
            <label>
              Turma
              <select
                value={turmaFilter}
                onChange={(event) => setTurmaFilter(event.target.value)}
              >
                <option value="all">Todas as turmas</option>
                <option value="team">Equipe</option>
                <option value="none">Sem turma</option>
                {turmas.map((turma) => (
                  <option key={turma.id} value={turma.id}>
                    {turma.nome}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Buscar por nome
              <input
                type="search"
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Digite o nome"
              />
            </label>
          </div>
          <div className="userDirectoryList">
            {users.length === 0 && !loading ? (
              <p>Nenhum usuário configurado.</p>
            ) : null}
            {users.length > 0 && filteredUsers.length === 0 ? (
              <p>Nenhum usuário encontrado com os filtros atuais.</p>
            ) : null}
            {filteredUsers.map((user) => (
              <button
                type="button"
                key={user.id}
                className={`directoryRow ${
                  user.id === selectedUserId ? "selected" : ""
                } ${!isProfessor ? "readOnly" : ""}`}
                onClick={() => isProfessor && startEditing(user)}
                style={{ cursor: isProfessor ? "pointer" : "default" }}
              >
                <UserAvatar user={user} size={42} />
                <div className="directoryMeta">
                  <strong>{user.displayName}</strong>
                  <span>@{user.username}</span>
                </div>
                <div className="directoryStatus">
                  <span>{getRoleLabel(user.role)}</span>
                  {user.role === "aluno" ? (
                    <span
                      className={`studentTypeBadge ${
                        user.studentType === "kids" ? "isKids" : "isNormal"
                      }`}
                    >
                      {getStudentTypeLabel(user.studentType)}
                    </span>
                  ) : null}
                  <span>
                    {user.role === "aluno"
                      ? turmaNameById.get(user.turmaId) || "Sem turma"
                      : "Equipe"}
                  </span>
                  <span className={user.active ? "active" : "inactive"}>
                    {user.active ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {dialogMode === "create" && createMode ? (
        <AppLikeDialog
          title="Criar usuário"
          icon="settings"
          onClose={cancelCreate}
          actions={
            <>
              <button
                type="submit"
                form="create-user-form"
                className="primaryDialogBtn"
                disabled={
                  loading ||
                  createUsernameStatus?.type === "checking" ||
                  createUsernameStatus?.type === "error"
                }
              >
                Criar usuário
              </button>
              <button
                type="button"
                className="secondaryDialogBtn"
                onClick={cancelCreate}
              >
                Voltar
              </button>
            </>
          }
        >
          <form
            id="create-user-form"
            className="userDialogForm userCreateCard"
            onSubmit={submitCreate}
          >
            <h3>Criar Usuário</h3>
            <p>
              Preencha os dados abaixo para cadastrar um novo usuário no
              sistema.
            </p>
            {message ? <p className="userDialogMessage">{message}</p> : null}
            <label>
              Nome completo
              <input
                name="displayName"
                value={createForm.displayName}
                onChange={updateCreateField}
                autoComplete="name"
                placeholder="Nome do usuário"
                autoFocus
                required
              />
            </label>
            <label>
              Nome de usuário
              <input
                name="username"
                value={createForm.username}
                onChange={updateCreateField}
                onBlur={checkCreateUsername}
                autoComplete="username"
                placeholder="usuario"
                minLength={3}
                required
              />
            </label>
            {createUsernameStatus ? (
              <p
                className={`formHint usernameStatus ${
                  createUsernameStatus.type === "ok"
                    ? "isOk"
                    : createUsernameStatus.type === "error"
                    ? "isError"
                    : "isChecking"
                }`}
              >
                {createUsernameStatus.text}
              </p>
            ) : null}
            <label>
              Senha inicial
              <div className="settingsPasswordInputWrapper">
                <input
                  name="password"
                  type={showCreatePassword ? "text" : "password"}
                  value={createForm.password}
                  onChange={updateCreateField}
                  autoComplete="new-password"
                  placeholder="Mínimo de 8 caracteres"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="settingsPasswordToggle"
                  onClick={() => setShowCreatePassword((state) => !state)}
                  aria-label={
                    showCreatePassword ? "Ocultar senha" : "Mostrar senha"
                  }
                >
                  <FontAwesomeIcon
                    icon={showCreatePassword ? faEyeSlash : faEye}
                  />
                </button>
              </div>
            </label>
            <label>
              Grupo
              <select
                name="role"
                value={createForm.role}
                onChange={updateCreateField}
              >
                <option value="aluno">Aluno</option>
                <option value="professor">Professor</option>
                <option value="secretaria">Secretaria</option>
              </select>
            </label>
            {createForm.role === "aluno" ? (
              <>
                {renderTurmaField(createForm, updateCreateField)}
                <p className="formHint">
                  Tipo aplicado:{" "}
                  <span
                    className={`studentTypeBadge ${
                      createForm.studentType === "kids" ? "isKids" : "isNormal"
                    }`}
                  >
                    {getStudentTypeLabel(createForm.studentType)}
                  </span>
                </p>
              </>
            ) : null}
          </form>
        </AppLikeDialog>
      ) : null}

      {dialogMode === "edit" && selectedUser ? (
        <AppLikeDialog
          title="Editar usuário"
          icon="settings"
          onClose={closeDialog}
          actions={
            <>
              <button
                type="submit"
                form="edit-user-form"
                className="primaryDialogBtn"
                disabled={loading}
              >
                Salvar alterações
              </button>
              <button
                type="button"
                className="secondaryDialogBtn"
                onClick={closeDialog}
              >
                Cancelar
              </button>
            </>
          }
        >
          <form
            id="edit-user-form"
            className="userDialogForm userEditCard"
            onSubmit={submitEdit}
          >
            <h3>Editar usuário</h3>
            <div className="editUserHeader">
              <UserAvatar user={selectedUser} size={52} />
              <div>
                <strong>{selectedUser.displayName}</strong>
                <span>@{selectedUser.username}</span>
                <div className="editUserTags">
                  <small>{getRoleLabel(selectedUser.role)}</small>
                  {selectedUser.role === "aluno" ? (
                    <small
                      className={`studentTypeBadge ${
                        selectedUser.studentType === "kids"
                          ? "isKids"
                          : "isNormal"
                      }`}
                    >
                      {getStudentTypeLabel(selectedUser.studentType)}
                    </small>
                  ) : null}
                </div>
              </div>
            </div>
            {message ? <p className="userDialogMessage">{message}</p> : null}
            <label>
              Nome completo
              <input
                name="displayName"
                value={editForm.displayName}
                onChange={updateEditField}
                autoComplete="name"
                autoFocus
                required
              />
            </label>
            <label>
              Nome de usuário
              <input
                name="username"
                value={editForm.username}
                autoComplete="username"
                readOnly
              />
            </label>
            <label>
              Grupo
              <select
                name="role"
                value={editForm.role}
                onChange={updateEditField}
              >
                <option value="aluno">Aluno</option>
                <option value="professor">Professor</option>
                <option value="secretaria">Secretaria</option>
              </select>
            </label>
            {editForm.role === "aluno" ? (
              <>
                {renderTurmaField(editForm, updateEditField)}
                <p className="formHint">
                  Tipo aplicado:{" "}
                  <span
                    className={`studentTypeBadge ${
                      editForm.studentType === "kids" ? "isKids" : "isNormal"
                    }`}
                  >
                    {getStudentTypeLabel(editForm.studentType)}
                  </span>
                </p>
              </>
            ) : null}
            <label>
              Nova senha
              <div className="settingsPasswordInputWrapper">
                <input
                  name="password"
                  type={showEditPassword ? "text" : "password"}
                  value={editForm.password}
                  onChange={updateEditField}
                  autoComplete="new-password"
                  placeholder="Deixe em branco para manter"
                  minLength={8}
                />
                <button
                  type="button"
                  className="settingsPasswordToggle"
                  onClick={() => setShowEditPassword((state) => !state)}
                  aria-label={
                    showEditPassword ? "Ocultar senha" : "Mostrar senha"
                  }
                >
                  <FontAwesomeIcon
                    icon={showEditPassword ? faEyeSlash : faEye}
                  />
                </button>
              </div>
            </label>
            <label className="toggleRow">
              <input
                name="active"
                type="checkbox"
                checked={editForm.active}
                onChange={updateEditField}
                disabled={selectedUser.username === currentUser.username}
              />
              <span>Usuário ativo</span>
            </label>
          </form>
        </AppLikeDialog>
      ) : null}
    </section>
  );
};
