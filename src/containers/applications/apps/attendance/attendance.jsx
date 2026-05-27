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

const formatTime = (value) =>
  value
    ? new Date(value).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
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

const getRangeFromDays = (days) => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  };
};

const professorTabs = [
  { id: "overview", label: "Visão Geral", icon: "faChartLine" },
  { id: "students", label: "Alunos", icon: "faUsers" },
  { id: "daily", label: "Por Dia", icon: "faCalendarDays" },
  { id: "records", label: "Registros", icon: "faListCheck" },
  { id: "print", label: "Impressão", icon: "faPrint" },
];

const studentTabs = [
  { id: "student-overview", label: "Resumo", icon: "faCircleCheck" },
  { id: "student-history", label: "Histórico", icon: "faClockRotateLeft" },
];

export const AttendanceApp = () => {
  const wnapp = useSelector((state) => state.apps.attendance);
  const user = useSelector((state) => state.setting.person);
  const isProfessor = user.role === "professor";
  const defaultRange = useMemo(() => getDefaultRange(), []);

  const [activeTab, setActiveTab] = useState(
    isProfessor ? "overview" : "student-overview"
  );
  const [turmas, setTurmas] = useState([]);
  const [summary, setSummary] = useState(null);
  const [studentAttendance, setStudentAttendance] = useState(null);
  const [selectedTurmaId, setSelectedTurmaId] = useState("");
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [studentSearch, setStudentSearch] = useState("");
  const [recordFilter, setRecordFilter] = useState("all");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const tabs = isProfessor ? professorTabs : studentTabs;
  const totals = summary?.totals || {
    students: 0,
    presences: 0,
    absences: 0,
    attendanceRate: 0,
  };
  const students = summary?.students || [];
  const daily = summary?.daily || [];
  const records = summary?.records || [];
  const studentRecords = studentAttendance?.records || [];
  const todayRecord = studentAttendance?.todayRecord;

  const filteredTurmaName =
    turmas.find((turma) => turma.id === selectedTurmaId)?.nome || "Todas";

  const filteredStudents = useMemo(() => {
    const search = studentSearch.trim().toLowerCase();
    if (!search) return students;
    return students.filter(
      (student) =>
        student.displayName.toLowerCase().includes(search) ||
        student.username.toLowerCase().includes(search) ||
        (student.turmaNome || "").toLowerCase().includes(search)
    );
  }, [students, studentSearch]);

  const filteredRecords = useMemo(() => {
    if (recordFilter === "all") return records;
    if (recordFilter === "multi") {
      return records.filter((record) => Number(record.loginCount || 0) > 1);
    }
    return records.filter((record) => record.turmaId === recordFilter);
  }, [records, recordFilter]);

  const strongestDays = useMemo(
    () =>
      [...daily]
        .sort((a, b) => b.attendanceRate - a.attendanceRate)
        .slice(0, 5),
    [daily]
  );

  const weakestDays = useMemo(
    () =>
      [...daily]
        .sort((a, b) => a.attendanceRate - b.attendanceRate)
        .slice(0, 5),
    [daily]
  );

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

  const reload = () => {
    if (isProfessor) loadProfessorData();
    else loadStudentData();
  };

  useEffect(() => {
    setActiveTab(isProfessor ? "overview" : "student-overview");
  }, [isProfessor]);

  useEffect(() => {
    if (wnapp.hide) return;
    reload();
  }, [wnapp.hide, isProfessor]);

  const applyQuickRange = (days) => {
    const range = getRangeFromDays(days);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const printReport = () => {
    window.print();
  };

  const renderSidebar = () => (
    <aside
      className={`attendance-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}
    >
      <div className="attendance-brand">
        <div className="attendance-brand-icon">
          <Icon src="attendance" width={22} />
        </div>
        <div className="attendance-nav-text">
          <strong>Frequência</strong>
          <span>{isProfessor ? "Professor" : "Aluno"}</span>
        </div>
      </div>

      <nav
        className="attendance-nav win11Scroll"
        aria-label="Seções de frequência"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`attendance-nav-link ${
              activeTab === tab.id ? "active" : ""
            }`}
            onClick={() => setActiveTab(tab.id)}
            aria-current={activeTab === tab.id ? "page" : undefined}
            title={tab.label}
          >
            <Icon fafa={tab.icon} width={15} />
            <span className="attendance-nav-text">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="attendance-sidebar-footer">
        <button
          type="button"
          className="attendance-nav-link"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={
            sidebarCollapsed ? "Expandir navegação" : "Recolher navegação"
          }
        >
          <Icon
            fafa={sidebarCollapsed ? "faAngleRight" : "faAngleLeft"}
            width={13}
          />
          <span className="attendance-nav-text">Recolher</span>
        </button>
      </div>
    </aside>
  );

  const renderHeader = (title, subtitle, actions = null) => (
    <header className="attendance-page-head">
      <div>
        <span className="attendance-kicker">Frequência</span>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className="attendance-actions">
        <button
          className="attendance-secondary"
          onClick={reload}
          disabled={loading}
        >
          <Icon fafa="faRotateRight" width={13} />
          Atualizar
        </button>
        {actions}
      </div>
    </header>
  );

  const renderFilters = () => (
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
      <div className="attendance-filter-actions">
        <div className="attendance-segmented">
          <button type="button" onClick={() => applyQuickRange(7)}>
            7 dias
          </button>
          <button type="button" onClick={() => applyQuickRange(30)}>
            30 dias
          </button>
          <button type="button" onClick={() => applyQuickRange(90)}>
            90 dias
          </button>
        </div>
        <button
          className="attendance-primary"
          onClick={loadProfessorData}
          disabled={loading}
        >
          Aplicar
        </button>
      </div>
    </section>
  );

  const renderStats = () => (
    <section className="attendance-stat-grid">
      <div className="attendance-stat">
        <span>Alunos</span>
        <strong>{totals.students}</strong>
        <small>{filteredTurmaName}</small>
      </div>
      <div className="attendance-stat">
        <span>Presenças</span>
        <strong>{totals.presences}</strong>
        <small>No período selecionado</small>
      </div>
      <div className="attendance-stat">
        <span>Ausências</span>
        <strong>{totals.absences}</strong>
        <small>Dias letivos sem login</small>
      </div>
      <div className="attendance-stat">
        <span>Aproveitamento</span>
        <strong>{totals.attendanceRate}%</strong>
        <small>{summary?.range?.totalDays || 0} dia(s)</small>
      </div>
    </section>
  );

  const renderStudentTable = (items = filteredStudents) => (
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
          {items.map((student) => (
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
          {items.length === 0 && !loading ? (
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
  );

  const renderDailyList = (items = daily) => (
    <div className="attendance-daily-list win11Scroll">
      {items.map((day) => (
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
      {items.length === 0 && !loading ? (
        <div className="attendance-empty">
          Nenhum dia no período selecionado.
        </div>
      ) : null}
    </div>
  );

  const renderRecordsTable = (items = filteredRecords) => (
    <div className="attendance-table-wrap win11Scroll">
      <table className="attendance-table wide">
        <thead>
          <tr>
            <th>Data</th>
            <th>Aluno</th>
            <th>Turma</th>
            <th>Primeiro login</th>
            <th>Último login</th>
            <th>Logins</th>
          </tr>
        </thead>
        <tbody>
          {items.map((record) => (
            <tr key={record.id}>
              <td>{formatDate(record.attendanceDate)}</td>
              <td>
                <strong>{record.displayName}</strong>
                <small>@{record.username}</small>
              </td>
              <td>{record.turmaNome || "Sem turma"}</td>
              <td>{formatTime(record.firstLoginAt)}</td>
              <td>{formatTime(record.lastLoginAt)}</td>
              <td>{record.loginCount}</td>
            </tr>
          ))}
          {items.length === 0 && !loading ? (
            <tr>
              <td colSpan={6}>
                <div className="attendance-empty">
                  Nenhum registro encontrado para os filtros atuais.
                </div>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );

  const renderOverview = () => (
    <>
      {renderHeader(
        "Visão geral",
        "Indicadores consolidados por turma e período.",
        <button
          className="attendance-primary"
          onClick={printReport}
          disabled={!summary}
        >
          <Icon fafa="faPrint" width={13} />
          Imprimir
        </button>
      )}
      {renderFilters()}
      {renderStats()}
      <section className="attendance-overview-grid">
        <div className="attendance-panel">
          <div className="attendance-panel-head">
            <h2>Resumo por aluno</h2>
            <span>{filteredStudents.length} aluno(s)</span>
          </div>
          {renderStudentTable(filteredStudents.slice(0, 8))}
        </div>
        <div className="attendance-panel">
          <div className="attendance-panel-head">
            <h2>Melhores dias</h2>
            <span>Top 5</span>
          </div>
          {renderDailyList(strongestDays)}
        </div>
        <div className="attendance-panel">
          <div className="attendance-panel-head">
            <h2>Pontos de atenção</h2>
            <span>Menor presença</span>
          </div>
          {renderDailyList(weakestDays)}
        </div>
      </section>
    </>
  );

  const renderStudents = () => (
    <>
      {renderHeader("Alunos", "Compare presença, ausência e último acesso.")}
      {renderFilters()}
      <section className="attendance-panel">
        <div className="attendance-panel-head">
          <h2>Lista de alunos</h2>
          <input
            className="attendance-search"
            value={studentSearch}
            onChange={(event) => setStudentSearch(event.target.value)}
            placeholder="Buscar aluno, usuário ou turma"
          />
        </div>
        {renderStudentTable()}
      </section>
    </>
  );

  const renderDaily = () => (
    <>
      {renderHeader(
        "Presença por dia",
        "Acompanhe a variação diária do período."
      )}
      {renderFilters()}
      <section className="attendance-panel">
        <div className="attendance-panel-head">
          <h2>Calendário analítico</h2>
          <span>
            {formatDate(summary?.range?.startDate)} até{" "}
            {formatDate(summary?.range?.endDate)}
          </span>
        </div>
        {renderDailyList()}
      </section>
    </>
  );

  const renderRecords = () => (
    <>
      {renderHeader("Registros", "Veja cada presença registrada pelo login.")}
      {renderFilters()}
      <section className="attendance-panel">
        <div className="attendance-panel-head">
          <h2>Registros de login</h2>
          <select
            className="attendance-select-compact"
            value={recordFilter}
            onChange={(event) => setRecordFilter(event.target.value)}
          >
            <option value="all">Todos os registros</option>
            <option value="multi">Com mais de um login</option>
            {turmas.map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.nome}
              </option>
            ))}
          </select>
        </div>
        {renderRecordsTable()}
      </section>
    </>
  );

  const renderPrint = () => (
    <>
      {renderHeader(
        "Impressão",
        "Prepare o relatório da frequência atual.",
        <button
          className="attendance-primary"
          onClick={printReport}
          disabled={!summary}
        >
          <Icon fafa="faPrint" width={13} />
          Imprimir relatório
        </button>
      )}
      {renderFilters()}
      <section className="attendance-panel print-preview-panel">
        <div className="attendance-panel-head">
          <h2>Prévia do relatório</h2>
          <span>{filteredTurmaName}</span>
        </div>
        <div className="attendance-print-preview win11Scroll">
          {renderPrintReport()}
        </div>
      </section>
    </>
  );

  const renderStudentOverview = () => (
    <>
      {renderHeader(
        "Minha frequência",
        "Presença registrada automaticamente ao entrar no simulador."
      )}
      <section className="attendance-student-status">
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
          <strong>{studentRecords.length}</strong>
          <small>Últimos 90 registros encontrados.</small>
        </div>
      </section>
      <section className="attendance-panel">
        <div className="attendance-panel-head">
          <h2>Últimas presenças</h2>
          <span>{user.name || user.username}</span>
        </div>
        {renderStudentHistoryTable(studentRecords.slice(0, 10))}
      </section>
    </>
  );

  const renderStudentHistoryTable = (items = studentRecords) => (
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
          {items.map((record) => (
            <tr key={record.id}>
              <td>{formatDate(record.attendanceDate)}</td>
              <td>{formatDateTime(record.firstLoginAt)}</td>
              <td>{formatDateTime(record.lastLoginAt)}</td>
              <td>{record.loginCount}</td>
            </tr>
          ))}
          {items.length === 0 && !loading ? (
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
  );

  const renderStudentHistory = () => (
    <>
      {renderHeader("Histórico", "Confira todos os registros recentes.")}
      <section className="attendance-panel">
        <div className="attendance-panel-head">
          <h2>Histórico individual</h2>
          <span>{studentRecords.length} registro(s)</span>
        </div>
        {renderStudentHistoryTable()}
      </section>
    </>
  );

  const renderPrintReport = () => (
    <div className="attendance-print-sheet">
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
    </div>
  );

  const renderActiveContent = () => {
    if (isProfessor) {
      if (activeTab === "students") return renderStudents();
      if (activeTab === "daily") return renderDaily();
      if (activeTab === "records") return renderRecords();
      if (activeTab === "print") return renderPrint();
      return renderOverview();
    }

    if (activeTab === "student-history") return renderStudentHistory();
    return renderStudentOverview();
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
      <div className="attendance-shell win11Scroll">
        {renderSidebar()}
        <main className="attendance-main">
          {message ? <div className="attendance-alert">{message}</div> : null}
          {renderActiveContent()}
        </main>
      </div>
      <section className="attendance-print-report">
        {renderPrintReport()}
      </section>
    </AppWindow>
  );
};
