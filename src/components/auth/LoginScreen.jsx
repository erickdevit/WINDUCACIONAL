import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { api } from "../../lib/api";
import { normalizeName } from "../../lib/ui";

const initialForm = {
  username: "",
  password: "",
  displayName: "",
  turmaCode: "",
  token: "",
};

export const LoginScreen = ({
  needsBootstrap,
  requiresToken,
  onLogin,
  onBootstrap,
  onRegister,
  error,
  loading,
}) => {
  const [form, setForm] = useState(initialForm);
  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null);
  const isRegister = !needsBootstrap && mode === "register";

  const changeField = (event) => {
    const value =
      event.target.name === "turmaCode"
        ? event.target.value
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "")
            .slice(0, 6)
        : event.target.name === "displayName"
        ? normalizeName(event.target.value)
        : event.target.value;
    setForm({
      ...form,
      [event.target.name]: value,
    });
    if (event.target.name === "username") setUsernameStatus(null);
  };

  const checkUsername = async () => {
    if (!needsBootstrap && !isRegister) return;
    const username = form.username.trim();
    if (username.length < 3) {
      setUsernameStatus(null);
      return;
    }
    setUsernameStatus({ type: "checking", text: "Verificando usuário..." });
    try {
      const result = await api.checkUsernameAvailability(username);
      setUsernameStatus(
        result.available
          ? { type: "ok", text: "Usuário disponível." }
          : { type: "error", text: "Este usuário já está em uso." }
      );
    } catch (error) {
      setUsernameStatus({ type: "error", text: error.message });
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (usernameStatus?.type === "error") return;
    if (needsBootstrap) {
      onBootstrap(form);
    } else if (isRegister) {
      onRegister({
        username: form.username,
        displayName: form.displayName,
        password: form.password,
        turmaCode: form.turmaCode,
      });
    } else {
      onLogin({
        username: form.username,
        password: form.password,
      });
    }
  };

  const togglePassword = () => setShowPassword(!showPassword);

  return (
    <main className="loginScreen">
      <section className="loginPanel">
        <header>
          <h1>
            {needsBootstrap
              ? "Configuração Inicial"
              : isRegister
              ? "Criar Conta"
              : "Bem-vindo"}
          </h1>
          <p className="loginDescription">
            {needsBootstrap
              ? "Configure a conta de administrador para começar."
              : isRegister
              ? "Informe seus dados para se cadastrar na turma."
              : "Acesse seu ambiente de aprendizado."}
          </p>
        </header>

        <form onSubmit={submit}>
          {needsBootstrap || isRegister ? (
            <label>
              <span>Nome completo</span>
              <input
                name="displayName"
                value={form.displayName}
                onChange={changeField}
                autoComplete="name"
                required
              />
            </label>
          ) : null}

          <label>
            <span>{isRegister ? "Nome de usuário" : "Usuário"}</span>
            <input
              name="username"
              value={form.username}
              onChange={changeField}
              onBlur={checkUsername}
              autoComplete="username"
              required
            />
          </label>
          {(needsBootstrap || isRegister) && usernameStatus ? (
            <p
              className={`loginUsernameStatus ${
                usernameStatus.type === "ok"
                  ? "isOk"
                  : usernameStatus.type === "error"
                  ? "isError"
                  : "isChecking"
              }`}
            >
              {usernameStatus.text}
            </p>
          ) : null}

          <label>
            <span>Senha</span>
            <div className="passwordInputWrapper">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={changeField}
                autoComplete={
                  needsBootstrap ? "new-password" : "current-password"
                }
                minLength={needsBootstrap ? 8 : undefined}
                required
              />
              <button
                type="button"
                className="passwordToggle"
                onClick={togglePassword}
                tabIndex="-1"
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </button>
            </div>
          </label>

          {isRegister ? (
            <label>
              <span>Código da turma</span>
              <input
                name="turmaCode"
                value={form.turmaCode}
                onChange={changeField}
                autoComplete="off"
                placeholder="ABC123"
                minLength={6}
                maxLength={6}
                required
              />
            </label>
          ) : null}

          {needsBootstrap && requiresToken ? (
            <label>
              <span>Token de segurança</span>
              <input
                name="token"
                type="password"
                value={form.token}
                onChange={changeField}
                autoComplete="off"
                required
              />
            </label>
          ) : null}

          {error ? <p className="loginError">{error}</p> : null}

          <button
            type="submit"
            className="submitButton"
            disabled={
              loading ||
              usernameStatus?.type === "error" ||
              usernameStatus?.type === "checking"
            }
          >
            {loading
              ? "Processando..."
              : needsBootstrap
              ? "Finalizar Configuração"
              : isRegister
              ? "Cadastrar"
              : "Entrar"}
          </button>
        </form>

        {!needsBootstrap ? (
          <footer className="loginSwitch">
            {isRegister ? (
              <p>
                Já tem uma conta?{" "}
                <button type="button" onClick={() => setMode("login")}>
                  Entrar
                </button>
              </p>
            ) : (
              <p>
                Não tem uma conta?{" "}
                <button type="button" onClick={() => setMode("register")}>
                  Cadastre-se
                </button>
              </p>
            )}
          </footer>
        ) : null}
      </section>
    </main>
  );
};
