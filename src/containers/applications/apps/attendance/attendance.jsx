import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { api } from "../../../../lib/api";
import { AppWindow } from "../../../../components/shared/AppWindow";
import { Icon } from "../../../../utils/general";
import "./attendance.scss";

const formatDate = (value) =>
  value ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR") : "-";

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "-";

const toDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDefaultRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  };
};

export const AttendanceApp = () => {
  const wnapp = useSelector((state) => state.apps.attendance);
  const user = useSelector((state) => state.setting.person);
  const isProfessor = user.role === "professor";
  const defaultRange = useMemo(() => getDefaultRange(), []);

  const [turmas, setTurmas] = useState([]);
  const [summary, setSummary] = useState(null);
  const [studentAttendance, setStudentAttendance] = useState(null);
  const [selectedTurmaId, setSelectedTurmaId] = useState("");
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadProfessorData = async () => {
    setLoading(true);
    setMessage("");
    try {
      const [turmasData, attendanceData] = await Promise.all([
        api.getTurmas(),
        api.getAttendanceSummary({
          startDate,
          endDate,
          turmaId: selectedTurmaId,
        }),
      ]);
      setTurmas(turmasData.turmas || []);
      setSummary(attendanceData);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentData = async () => {
    setLoading(true);
    setMessage("");
    try {
      const data = await api.getMyAttendance();
      setStudentAttendance(data);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (wnapp.hide) return;
    if (isProfessor) loadProfessorData();
    else loadStudentData();
  }, [wnapp.hide, isProfessor]);

  const filteredTurmaName =
    turmas.find((turma) => turma.id === selectedTurmaId)?.nome || "Todas";

  const printReport = () => {
    window.print();
  };

  const renderStudentView = () => {
    const todayRecord = studentAttendance?.todayRecord;
    const records = studentAttendance?.records || [];

    return (
      <main className="attendance-main win11Scroll">
        <section className="attendance-hero">
          <div>
            <span className="attendance-kicker">Minha frequência</span>
            <h1>Presença registrada automaticamente</h1>
            <p>
              Ao entrar no simulador, sua presença do dia é registrada com o
              horário do login.
            </p>
          </div>
          <button className="attendance-secondary" onClick={loadStudentData}>
            <Icon fafa="faRotateRight" width={13} />
            Atualizar
          </button>
        </section>

        {message ? <div className="attendance-alert">{message}</div> : null}

        <div className="attendance-student-status">
          <div
            className={`attendance-status-card ${todayRecord ? "present" : ""}`}
          >
            <span>Hoje</span>
            <strong>{todayRecord ? "Presente" : "Não registrado"}</strong>
            <small>
              {todayRecord
                ? `Primeiro login: ${formatDateTime(todayRecord.firstLoginAt)}`
                : "Entre novamente se a presença não aparecer."}
            </small>
          </div>
          <div className="attendance-status-card">
            <span>Registros recentes</span>
            <strong>{records.length}</strong>
            <small>Últimos 90 registros encontrados.</small>
          </div>
        </div>

        <section className="attendance-panel">
          <div className="attendance-panel-head">
            <h2>Histórico</h2>
          </div>
          <div className="attendance-table-wrap win11Scroll">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Primeiro login</th>
                  <th>Último login</th>
                  <th>Logins</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.attendanceDate)}</td>
                    <td>{formatDateTime(record.firstLoginAt)}</td>
                    <td>{formatDateTime(record.lastLoginAt)}</td>
                    <td>{record.loginCount}</td>
                  </tr>
                ))}
                {records.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="attendance-empty">
                        Nenhuma presença registrada ainda.
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    );
  };

  const renderProfessorView = () => {
    const totals = summary?.totals || {
      students: 0,
      presences: 0,
      absences: 0,
      attendanceRate: 0,
    };
    const students = summary?.students || [];
    const daily = summary?.daily || [];

    return (
      <main className="attendance-main win11Scroll">
        <section className="attendance-toolbar">
          <div>
            <span className="attendance-kicker">Frequência</span>
            <h1>Controle de presença dos alunos</h1>
          </div>
          <div className="attendance-actions">
            <button
              className="attendance-secondary"
              onClick={loadProfessorData}
              disabled={loading}
            >
              <Icon fafa="faRotateRight" width={13} />
              Atualizar
            </button>
            <button
              className="attendance-primary"
              onClick={printReport}
              disabled={!summary}
            >
              <Icon fafa="faPrint" width={13} />
              Imprimir
            </button>
          </div>
        </section>

        <section className="attendance-filters">
          <label>
            <span>Turma</span>
            <select
              value={selectedTurmaId}
              onChange={(event) => setSelectedTurmaId(event.target.value)}
            >
              <option value="">Todas as turmas</option>
              {turmas.map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Início</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
          <label>
            <span>Fim</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
          <button
            className="attendance-primary"
            onClick={loadProfessorData}
            disabled={loading}
          >
            Aplicar filtros
          </button>
        </section>

        {message ? <div className="attendance-alert">{message}</div> : null}

        <section className="attendance-stat-grid">
          <div className="attendance-stat">
            <span>Alunos</span>
            <strong>{totals.students}</strong>
          </div>
          <div className="attendance-stat">
            <span>Presenças</span>
            <strong>{totals.presences}</strong>
          </div>
          <div className="attendance-stat">
            <span>Ausências</span>
            <strong>{totals.absences}</strong>
          </div>
          <div className="attendance-stat">
            <span>Aproveitamento</span>
            <strong>{totals.attendanceRate}%</strong>
          </div>
        </section>

        <section className="attendance-layout">
          <div className="attendance-panel">
            <div className="attendance-panel-head">
              <h2>Resumo por aluno</h2>
              <span>{filteredTurmaName}</span>
            </div>
            <div className="attendance-table-wrap win11Scroll">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Turma</th>
                    <th>Presenças</th>
                    <th>Ausências</th>
                    <th>%</th>
                    <th>Último login</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td>
                        <strong>{student.displayName}</strong>
                        <small>@{student.username}</small>
                      </td>
                      <td>{student.turmaNome || "Sem turma"}</td>
                      <td>{student.presentDays}</td>
                      <td>{student.absentDays}</td>
                      <td>
                        <span className="attendance-rate">
                          {student.attendanceRate}%
                        </span>
                      </td>
                      <td>{formatDateTime(student.lastLoginAt)}</td>
                    </tr>
                  ))}
                  {students.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="attendance-empty">
                          Nenhum aluno encontrado para os filtros atuais.
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="attendance-panel">
            <div className="attendance-panel-head">
              <h2>Presença por dia</h2>
              <span>
                {formatDate(summary?.range?.startDate)} até{" "}
                {formatDate(summary?.range?.endDate)}
              </span>
            </div>
            <div className="attendance-daily-list win11Scroll">
              {daily.map((day) => (
                <div className="attendance-day-row" key={day.date}>
                  <div>
                    <strong>{formatDate(day.date)}</strong>
                    <span>{day.attendanceRate}% de presença</span>
                  </div>
                  <div>
                    <b>{day.present}</b>
                    <small>presentes</small>
                  </div>
                  <div>
                    <b>{day.absent}</b>
                    <small>ausentes</small>
                  </div>
                </div>
              ))}
              {daily.length === 0 && !loading ? (
                <div className="attendance-empty">
                  Nenhum dia no período selecionado.
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="attendance-print-report">
          <h1>Relatório de frequência</h1>
          <p>
            Turma: {filteredTurmaName} | Período:{" "}
            {formatDate(summary?.range?.startDate)} até{" "}
            {formatDate(summary?.range?.endDate)}
          </p>
          <table>
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Turma</th>
                <th>Presenças</th>
                <th>Ausências</th>
                <th>Aproveitamento</th>
                <th>Último login</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td>{student.displayName}</td>
                  <td>{student.turmaNome || "Sem turma"}</td>
                  <td>{student.presentDays}</td>
                  <td>{student.absentDays}</td>
                  <td>{student.attendanceRate}%</td>
                  <td>{formatDateTime(student.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    );
  };

  return (
    <AppWindow
      wnapp={wnapp}
      app={wnapp.action}
      icon={wnapp.icon}
      name="Frequência"
      className="attendanceApp"
      windowScreenClassName="flex flex-col"
      restWindowClassName="flex-grow flex flex-col"
    >
      {isProfessor ? renderProfessorView() : renderStudentView()}
    </AppWindow>
  );
};
