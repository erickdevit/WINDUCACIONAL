import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { api } from "../../../../lib/api";
import { AppWindow } from "../../../../components/shared/AppWindow";
import { Icon } from "../../../../utils/general";
import "./attendance.scss";

/* ─── Helpers de data ─────────────────────────────────── */
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
  const today = new Date();
  return {
    startDate: toDateInputValue(today),
    endDate: toDateInputValue(today),
  };
};

/* ─── Helpers de cor por taxa ─────────────────────────── */
const rateColor = (rate) => {
  if (rate >= 75) return "var(--at-green)";
  if (rate >= 50) return "var(--at-yellow)";
  return "var(--at-red)";
};

const rateClass = (rate) => {
  if (rate >= 75) return "good";
  if (rate >= 50) return "warn";
  return "bad";
};

/* ─── Tabs ────────────────────────────────────────────── */
const professorTabs = [
  { id: "overview", label: "Visão Geral", icon: "faChartLine" },
  { id: "students", label: "Alunos", icon: "faUsers" },
  { id: "daily", label: "Por Dia", icon: "faCalendarDays" },
  { id: "records", label: "Registros", icon: "faListCheck" },
  { id: "print", label: "Impressão", icon: "faPrint" },
  { id: "register", label: "Registrar", icon: "faUserCheck" },
];

const studentTabs = [
  { id: "student-overview", label: "Resumo", icon: "faCircleCheck" },
  { id: "student-history", label: "Histórico", icon: "faClockRotateLeft" },
];

/* ─── Gráfico de Rosca (Donut) ────────────────────────── */
const DonutChart = ({ present, absent, size = 160 }) => {
  const total = present + absent;
  if (total === 0) {
    return (
      <div className="at-donut-wrap">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 16}
            fill="none"
            stroke="#e5eaf1"
            strokeWidth={28}
          />
        </svg>
        <div className="at-donut-label">
          <strong>–</strong>
          <span>sem dados</span>
        </div>
      </div>
    );
  }
  const rate = Math.round((present / total) * 100);
  const r = size / 2 - 16;
  const circ = 2 * Math.PI * r;
  const presentArc = (present / total) * circ;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="at-donut-wrap">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#e5eaf1"
          strokeWidth={28}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--at-accent)"
          strokeWidth={28}
          strokeDasharray={`${presentArc} ${circ - presentArc}`}
          strokeLinecap="round"
        />
        {absent > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="var(--at-red)"
            strokeWidth={28}
            strokeDasharray={`${circ - presentArc - 4} ${presentArc + 4}`}
            strokeDashoffset={-(presentArc + 2)}
            strokeLinecap="round"
            opacity={0.65}
          />
        )}
      </svg>
      <div className="at-donut-label">
        <strong>{rate}%</strong>
        <span>frequência</span>
      </div>
    </div>
  );
};

/* ─── Gráfico de Barras por Dia ───────────────────────── */
const BarChartDays = ({ daily, maxBars = 30 }) => {
  const items = useMemo(
    () =>
      [...daily]
        .sort((a, b) => (a.date > b.date ? 1 : -1))
        .slice(-maxBars),
    [daily, maxBars]
  );

  if (items.length === 0) {
    return (
      <div className="at-barchart-empty">Nenhum dado no período.</div>
    );
  }

  const BAR_W = 14;
  const GAP = 4;
  const H = 100;
  const svgW = items.length * (BAR_W + GAP);

  return (
    <div className="at-barchart-wrap win11Scroll">
      <svg
        width={svgW}
        height={H + 24}
        viewBox={`0 0 ${svgW} ${H + 24}`}
        className="at-barchart"
      >
        {items.map((day, i) => {
          const rate = Number(day.attendanceRate) || 0;
          const barH = Math.max(4, (rate / 100) * H);
          const x = i * (BAR_W + GAP);
          const y = H - barH;
          const color =
            rate >= 75
              ? "var(--at-accent)"
              : rate >= 50
              ? "var(--at-yellow)"
              : "var(--at-red)";
          return (
            <g key={day.date}>
              <rect
                x={x}
                y={0}
                width={BAR_W}
                height={H}
                rx={4}
                fill="#f0f4f8"
              />
              <rect
                x={x}
                y={y}
                width={BAR_W}
                height={barH}
                rx={4}
                fill={color}
                opacity={0.9}
              >
                <title>
                  {formatDate(day.date)} — {rate}%
                </title>
              </rect>
            </g>
          );
        })}
      </svg>
      <div className="at-barchart-legend">
        <span style={{ color: "var(--at-accent)" }}>≥75% bom</span>
        <span style={{ color: "var(--at-yellow)" }}>50–74% atenção</span>
        <span style={{ color: "var(--at-red)" }}>&lt;50% crítico</span>
      </div>
    </div>
  );
};


/* ─── Mini calendário de 7 dias ───────────────────────── */
const WeekCalendar = ({ records }) => {
  const days = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = toDateInputValue(d);
      const rec = records.find((r) => r.attendanceDate === key);
      result.push({ date: key, label: d.toLocaleDateString("pt-BR", { weekday: "short" }), rec });
    }
    return result;
  }, [records]);

  return (
    <div className="at-week-cal">
      {days.map(({ date, label, rec }) => (
        <div
          key={date}
          className={`at-week-day ${rec ? "present" : "absent"}`}
          title={`${formatDate(date)}: ${rec ? "Presente" : "Sem registro"}`}
        >
          <span className="at-week-day-label">{label}</span>
          <div className="at-week-day-dot">
            {rec ? <Icon fafa="faCheck" width={10} /> : null}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─── Componente principal ────────────────────────────── */
export const AttendanceView = ({ standalone = false, visible = true }) => {
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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [registerDate, setRegisterDate] = useState(toDateInputValue(new Date()));
  const [registerTurmaId, setRegisterTurmaId] = useState("");
  const [registerStudents, setRegisterStudents] = useState([]);
  const [savingRegister, setSavingRegister] = useState(false);
  const [printDate, setPrintDate] = useState("");

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
    if (!visible) return;
    reload();
  }, [visible, isProfessor]);

  useEffect(() => {
    if (!isProfessor) setMobileFiltersOpen(false);
  }, [isProfessor]);


  const printReport = () => {
    window.print();
  };

  /* ── Sidebar ─────────────────────────────────────────── */
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
          title={sidebarCollapsed ? "Expandir navegação" : "Recolher navegação"}
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

  /* ── Nav mobile ──────────────────────────────────────── */
  const renderMobileNav = () => (
    <nav
      className="attendance-mobile-nav"
      aria-label="Seções de frequência"
      style={{ "--attendance-mobile-nav-count": tabs.length }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={activeTab === tab.id ? "active" : ""}
          onClick={() => setActiveTab(tab.id)}
          aria-current={activeTab === tab.id ? "page" : undefined}
        >
          <Icon fafa={tab.icon} width={15} />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );

  /* ── Cabeçalho de página ─────────────────────────────── */
  const renderHeader = (title, actions = null) => (
    <header className="attendance-page-head">
      <div>
        <h1>{title}</h1>
        {isProfessor ? (
          <p className="attendance-filter-summary attendance-mobile-only">
            {filteredTurmaName} · {formatDate(startDate)} até{" "}
            {formatDate(endDate)}
          </p>
        ) : null}
      </div>
      <div className="attendance-actions">
        {actions}
      </div>
    </header>
  );

  /* ── Filtros ─────────────────────────────────────────── */
  const renderFilters = (isInline = false) => (
    <>
      {mobileFiltersOpen ? (
        <button
          type="button"
          className="attendance-filter-backdrop attendance-mobile-only"
          aria-label="Fechar filtros"
          onClick={() => setMobileFiltersOpen(false)}
        />
      ) : null}
      <section
        className={`attendance-filters ${
          mobileFiltersOpen ? "mobile-open" : ""
        }`}
        style={isInline ? { margin: 0, padding: 0, border: "none", boxShadow: "none", flex: "1 1 auto", display: "flex", justifyContent: "flex-end", backgroundColor: "transparent" } : {}}
      >
        <div className="attendance-filter-drawer-head attendance-mobile-only">
          <strong>Filtros</strong>
          <button
            type="button"
            aria-label="Fechar filtros"
            onClick={() => setMobileFiltersOpen(false)}
          >
            <Icon fafa="faXmark" width={13} />
          </button>
        </div>
        <label>
          <span style={isInline ? { display: "none" } : {}}>Turma</span>
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
          <span style={isInline ? { display: "none" } : {}}>Início</span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>
        <label>
          <span style={isInline ? { display: "none" } : {}}>Fim</span>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </label>
        <div className="attendance-filter-actions">
          <button
            className="attendance-primary"
            onClick={() => {
              loadProfessorData();
              setMobileFiltersOpen(false);
            }}
            disabled={loading}
          >
            Aplicar
          </button>
          <button
            className="attendance-secondary"
            onClick={printReport}
            disabled={!summary}
            title="Imprimir"
          >
            <Icon fafa="faPrint" width={13} />
            {isInline ? "" : " Imprimir"}
          </button>
        </div>
      </section>
    </>
  );

  /* ── Cards de estatísticas melhorados ────────────────── */
  const renderStats = () => {
    const rate = Number(totals.attendanceRate) || 0;
    return (
      <section className="at-stat-grid">
        <div className="at-stat at-stat--blue">
          <div className="at-stat-icon">
            <Icon fafa="faUsers" width={18} />
          </div>
          <div className="at-stat-body">
            <span>Alunos</span>
            <strong>{totals.students}</strong>
            <small>no período</small>
          </div>
        </div>
        <div className="at-stat at-stat--green">
          <div className="at-stat-icon">
            <Icon fafa="faCircleCheck" width={18} />
          </div>
          <div className="at-stat-body">
            <span>Presenças</span>
            <strong>{totals.presences}</strong>
            <small>registros</small>
          </div>
        </div>
        <div className="at-stat at-stat--red">
          <div className="at-stat-icon">
            <Icon fafa="faCircleXmark" width={18} />
          </div>
          <div className="at-stat-body">
            <span>Ausências</span>
            <strong>{totals.absences}</strong>
            <small>dias sem registro</small>
          </div>
        </div>
        <div className={`at-stat at-stat--${rateClass(rate)}`}>
          <div className="at-stat-icon">
            <Icon fafa="faChartLine" width={18} />
          </div>
          <div className="at-stat-body">
            <span>Aproveitamento</span>
            <strong>{rate}%</strong>
            <small>
              {rate >= 75 ? "Bom" : rate >= 50 ? "Atenção" : "Crítico"}
            </small>
          </div>
        </div>
      </section>
    );
  };

  /* ── Tabela de alunos (desktop) ──────────────────────── */
  const renderStudentCards = (items = filteredStudents) => (
    <div className="attendance-card-list attendance-mobile-only">
      {items.map((student) => (
        <article className="attendance-mobile-card" key={student.id}>
          <header>
            <div>
              <strong>{student.displayName}</strong>
              <span>@{student.username}</span>
            </div>
            <span
              className={`at-badge at-badge--${rateClass(student.attendanceRate)}`}
            >
              {student.attendanceRate}%
            </span>
          </header>
          <dl>
            <div>
              <dt>Turma</dt>
              <dd>{student.turmaNome || "Sem turma"}</dd>
            </div>
            <div>
              <dt>Presenças</dt>
              <dd>{student.presentDays}</dd>
            </div>
            <div>
              <dt>Ausências</dt>
              <dd>{student.absentDays}</dd>
            </div>
            <div>
              <dt>Último login</dt>
              <dd>{formatDateTime(student.lastLoginAt)}</dd>
            </div>
          </dl>
        </article>
      ))}
      {items.length === 0 && !loading ? (
        <div className="at-empty">
          <Icon fafa="faUsersSlash" width={32} />
          <p>Nenhum aluno encontrado para os filtros atuais.</p>
        </div>
      ) : null}
    </div>
  );

  const renderStudentTable = (items = filteredStudents) => (
    <>
      <div className="attendance-table-wrap attendance-desktop-table win11Scroll">
        <table className="attendance-table">
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Turma</th>
              <th>Presenças</th>
              <th>Ausências</th>
              <th>Frequência</th>
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
                <td className="at-num">{student.presentDays}</td>
                <td className="at-num">{student.absentDays}</td>
                <td>
                  <span className={`at-badge at-badge--${rateClass(student.attendanceRate)}`}>
                    {student.attendanceRate}%
                  </span>
                </td>
                <td>{formatDateTime(student.lastLoginAt)}</td>
              </tr>
            ))}
            {items.length === 0 && !loading ? (
              <tr>
                <td colSpan={6}>
                  <div className="at-empty">
                    <Icon fafa="faUsersSlash" width={28} />
                    <p>Nenhum aluno encontrado.</p>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {renderStudentCards(items)}
    </>
  );

  /* ── Lista de dias ───────────────────────────────────── */
  const renderDailyList = (items = daily) => (
    <div className="at-daily-list win11Scroll">
      {items.length === 0 && !loading ? (
        <div className="at-empty">
          <Icon fafa="faCalendarXmark" width={28} />
          <p>Nenhum dia no período selecionado.</p>
        </div>
      ) : null}
      {items.map((day) => {
        const rate = Number(day.attendanceRate) || 0;
        return (
          <div className="at-day-row" key={day.date}>
            <div className="at-day-info">
              <strong>{formatDate(day.date)}</strong>
              <span className={`at-badge at-badge--${rateClass(rate)}`}>{rate}%</span>
            </div>
            <div className="at-day-counts">
              <div className="at-day-count at-day-count--present">
                <b>{day.present}</b>
                <small>presentes</small>
              </div>
              <div className="at-day-count at-day-count--absent">
                <b>{day.absent}</b>
                <small>ausentes</small>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  /* ── Cards de registros (mobile) ─────────────────────── */
  const renderRecordCards = (items = filteredRecords) => (
    <div className="attendance-card-list attendance-mobile-only">
      {items.map((record) => (
        <article className="attendance-mobile-card" key={record.id}>
          <header>
            <div>
              <strong>{record.displayName}</strong>
              <span>{formatDate(record.attendanceDate)}</span>
            </div>
            <span
              className={`at-badge ${Number(record.loginCount) > 1 ? "at-badge--multi" : ""}`}
            >
              {record.loginCount} login{Number(record.loginCount) !== 1 ? "s" : ""}
            </span>
          </header>
          <dl>
            <div>
              <dt>Turma</dt>
              <dd>{record.turmaNome || "Sem turma"}</dd>
            </div>
            <div>
              <dt>Primeiro login</dt>
              <dd>{formatTime(record.firstLoginAt)}</dd>
            </div>
            <div>
              <dt>Último login</dt>
              <dd>{formatTime(record.lastLoginAt)}</dd>
            </div>
            <div>
              <dt>Usuário</dt>
              <dd>@{record.username}</dd>
            </div>
          </dl>
        </article>
      ))}
      {items.length === 0 && !loading ? (
        <div className="at-empty">
          <Icon fafa="faClipboardList" width={28} />
          <p>Nenhum registro encontrado.</p>
        </div>
      ) : null}
    </div>
  );

  const renderRecordsTable = (items = filteredRecords) => (
    <>
      <div className="attendance-table-wrap attendance-desktop-table win11Scroll">
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
              <tr key={record.id} className={Number(record.loginCount) > 1 ? "at-row--multi" : ""}>
                <td>{formatDate(record.attendanceDate)}</td>
                <td>
                  <strong>{record.displayName}</strong>
                  <small>@{record.username}</small>
                </td>
                <td>{record.turmaNome || "Sem turma"}</td>
                <td>{formatTime(record.firstLoginAt)}</td>
                <td>{formatTime(record.lastLoginAt)}</td>
                <td>
                  {Number(record.loginCount) > 1 ? (
                    <span className="at-badge at-badge--multi">{record.loginCount}</span>
                  ) : (
                    record.loginCount
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading ? (
              <tr>
                <td colSpan={6}>
                  <div className="at-empty">
                    <Icon fafa="faClipboardList" width={28} />
                    <p>Nenhum registro encontrado.</p>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {renderRecordCards(items)}
    </>
  );

  /* ── DASHBOARD — Visão Geral ─────────────────────────── */
  const renderOverview = () => (
    <>
      {renderFilters(false)}
      {renderHeader("Visão geral")}
      {renderStats()}

      {/* Linha de gráficos */}
      <section className="at-charts-row">
        <div className="at-panel at-panel--donut">
          <div className="at-panel-head">
            <h2>Presenças × Ausências</h2>
            <span className="at-panel-sub">total no período</span>
          </div>
          <div className="at-panel-body at-panel-body--center">
            <DonutChart
              present={totals.presences}
              absent={totals.absences}
              size={160}
            />
            <div className="at-donut-legend">
              <div>
                <span className="at-legend-dot at-legend-dot--green" />
                <span>Presenças</span>
                <strong>{totals.presences}</strong>
              </div>
              <div>
                <span className="at-legend-dot at-legend-dot--red" />
                <span>Ausências</span>
                <strong>{totals.absences}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="at-panel at-panel--bar">
          <div className="at-panel-head">
            <h2>Frequência por dia</h2>
            <span className="at-panel-sub">{daily.length} dias no período</span>
          </div>
          <div className="at-panel-body">
            <BarChartDays daily={daily} maxBars={40} />
          </div>
        </div>
      </section>

      {/* Destaques + Top alunos */}
      <section className="at-highlights-row">
        <div className="at-panel">
          <div className="at-panel-head">
            <h2>
              <Icon fafa="faTrophy" width={13} />
              Melhores dias
            </h2>
          </div>
          <div className="at-day-mini-list">
            {strongestDays.length === 0 ? (
              <div className="at-empty-sm">Sem dados</div>
            ) : (
              strongestDays.map((day) => (
                <div className="at-day-mini" key={day.date}>
                  <span>{formatDate(day.date)}</span>
                  <span className={`at-badge at-badge--${rateClass(Number(day.attendanceRate) || 0)}`}>
                    {Number(day.attendanceRate) || 0}%
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="at-panel">
          <div className="at-panel-head">
            <h2>
              <Icon fafa="faTriangleExclamation" width={13} />
              Pontos de atenção
            </h2>
          </div>
          <div className="at-day-mini-list">
            {weakestDays.length === 0 ? (
              <div className="at-empty-sm">Sem dados</div>
            ) : (
              weakestDays.map((day) => (
                <div className="at-day-mini" key={day.date}>
                  <span>{formatDate(day.date)}</span>
                  <span className={`at-badge at-badge--${rateClass(Number(day.attendanceRate) || 0)}`}>
                    {Number(day.attendanceRate) || 0}%
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="at-panel at-panel--students-top">
          <div className="at-panel-head">
            <h2>Alunos — resumo</h2>
            <span className="at-panel-sub">{students.length} alunos</span>
          </div>
          <div className="at-students-mini-list win11Scroll">
            {students.length === 0 ? (
              <div className="at-empty-sm">Sem dados</div>
            ) : (
              [...students]
                .sort((a, b) => b.attendanceRate - a.attendanceRate)
                .slice(0, 10)
                .map((s) => (
                  <div className="at-student-mini" key={s.id}>
                    <div className="at-student-mini-info">
                      <strong>{s.displayName}</strong>
                      <small>{s.turmaNome || "Sem turma"}</small>
                    </div>
                    <span className={`at-badge at-badge--${rateClass(s.attendanceRate)}`}>
                      {s.attendanceRate}%
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>
      </section>
    </>
  );

  /* ── Alunos ──────────────────────────────────────────── */
  const renderStudents = () => (
    <>
      {renderHeader("Alunos")}
      <section className="at-panel">
        <div className="at-panel-head" style={{ flexWrap: "wrap", gap: "10px", justifyContent: "space-between" }}>
          <div>
            <div className="at-search-wrap" style={{ display: "inline-flex", marginRight: "10px" }}>
              <Icon fafa="faMagnifyingGlass" width={13} />
              <input
                className="attendance-search"
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="Buscar aluno, usuário ou turma"
              />
            </div>
            <span className="at-panel-sub">
              {filteredStudents.length} aluno{filteredStudents.length !== 1 ? "s" : ""}
            </span>
          </div>
          {renderFilters(true)}
        </div>
        {renderStudentTable()}
      </section>
    </>
  );

  /* ── Por Dia ─────────────────────────────────────────── */
  const renderDaily = () => (
    <>
      {renderHeader("Por dia")}
      <section className="at-panel">
        <div className="at-panel-head" style={{ flexWrap: "wrap", gap: "10px", justifyContent: "space-between" }}>
          <div>
            <h2>Dias no período</h2>
            <span className="at-panel-sub">{daily.length} dias</span>
          </div>
          {renderFilters(true)}
        </div>
        {renderDailyList()}
      </section>
    </>
  );

  /* ── Registros ───────────────────────────────────────── */
  const renderRecords = () => (
    <>
      {renderHeader("Registros")}
      <section className="at-panel">
        <div className="at-panel-head" style={{ flexWrap: "wrap", gap: "10px", justifyContent: "space-between" }}>
          <div>
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
            <span className="at-panel-sub" style={{ marginLeft: "10px" }}>
              {filteredRecords.length} registro{filteredRecords.length !== 1 ? "s" : ""}
            </span>
          </div>
          {renderFilters(true)}
        </div>
        {renderRecordsTable()}
      </section>
    </>
  );

  /* ── Registrar ───────────────────────────────────────── */
  const renderRegister = () => {
    const handleToggleStudent = (studentId) => {
      setRegisterStudents((prev) =>
        prev.map((s) =>
          s.id === studentId ? { ...s, isPresent: !s.isPresent } : s
        )
      );
    };

    const handleSelectAll = (val) => {
      setRegisterStudents((prev) =>
        prev.map((s) => ({ ...s, isPresent: val }))
      );
    };

    const loadRegisterStudents = () => {
      if (!registerTurmaId) {
        setMessage("Selecione uma turma para registrar a frequência.");
        setTimeout(() => setMessage(""), 3000);
        return;
      }
      const turmaStudents = students.filter(s => s.turmaId === registerTurmaId || s.turmaNome === turmas.find(t=>t.id===registerTurmaId)?.nome);
      setRegisterStudents(
        turmaStudents.map((s) => ({
          id: s.id,
          displayName: s.displayName,
          username: s.username,
          isPresent: true,
        }))
      );
    };

    const handleSaveRegister = async () => {
      setSavingRegister(true);
      setMessage("");
      try {
        const payload = {
          date: registerDate,
          turmaId: registerTurmaId,
          students: registerStudents.map(s => ({ id: s.id, isPresent: s.isPresent }))
        };
        await api.saveAttendance(payload);
        setMessage("Frequência registrada com sucesso!");
        setTimeout(() => setMessage(""), 3000);
      } catch (err) {
        setMessage("Atenção: " + err.message + " (backend pendente)");
        setTimeout(() => setMessage(""), 5000);
      } finally {
        setSavingRegister(false);
      }
    };

    return (
      <>
        {renderHeader("Registrar frequência")}
        <section className="at-panel">
          <div className="at-panel-head">
            <h2>Configuração</h2>
          </div>
          <div className="at-panel-body at-panel-body--center">
            <label>
              <span style={{display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: "700"}}>Data</span>
              <input
                type="date"
                value={registerDate}
                onChange={(e) => setRegisterDate(e.target.value)}
                style={{padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--at-line)"}}
              />
            </label>
            <label>
              <span style={{display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: "700"}}>Turma</span>
              <select
                value={registerTurmaId}
                onChange={(e) => setRegisterTurmaId(e.target.value)}
                style={{padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--at-line)"}}
              >
                <option value="">Selecione...</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </label>
            <button className="attendance-primary" onClick={loadRegisterStudents} disabled={!registerTurmaId} style={{marginTop: "20px"}}>
              Carregar alunos
            </button>
          </div>
        </section>

        {registerStudents.length > 0 && (
          <section className="at-panel">
            <div className="at-panel-head" style={{flexWrap: "wrap"}}>
              <h2>Alunos da Turma ({registerStudents.length})</h2>
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="attendance-secondary" onClick={() => handleSelectAll(true)}>Marcar Todos</button>
                <button className="attendance-secondary" onClick={() => handleSelectAll(false)}>Desmarcar Todos</button>
              </div>
            </div>
            <div className="attendance-table-wrap win11Scroll" style={{maxHeight: "400px"}}>
              <table className="attendance-table wide">
                <thead>
                  <tr>
                    <th style={{ width: "60px", textAlign: "center" }}>Status</th>
                    <th>Aluno</th>
                  </tr>
                </thead>
                <tbody>
                  {registerStudents.map((s) => (
                    <tr key={s.id} onClick={() => handleToggleStudent(s.id)} style={{ cursor: "pointer" }}>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={s.isPresent}
                          onChange={() => handleToggleStudent(s.id)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ transform: "scale(1.2)", cursor: "pointer" }}
                        />
                      </td>
                      <td>
                        <strong>{s.displayName}</strong> <small>@{s.username}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="at-panel-body" style={{ textAlign: "right", borderTop: "1px solid var(--at-line)" }}>
              <button className="attendance-primary" onClick={handleSaveRegister} disabled={savingRegister}>
                <Icon fafa="faCheck" width={14} /> {savingRegister ? "Salvando..." : "Salvar Registro"}
              </button>
            </div>
          </section>
        )}
      </>
    );
  };

  /* ── Impressão ───────────────────────────────────────── */
  const renderPrint = () => (
    <>
      {renderHeader("Impressão")}
      <section className="at-panel print-preview-panel">
        <div className="at-panel-head" style={{ flexWrap: "wrap", gap: "10px", justifyContent: "space-between" }}>
          <h2>Prévia do relatório</h2>
          {renderFilters(true)}
        </div>
        <div className="attendance-print-preview win11Scroll">
          {renderPrintReport()}
        </div>
      </section>
    </>
  );

  /* ── Resumo do Aluno ─────────────────────────────────── */
  const renderStudentOverview = () => {
    const presentCount = studentRecords.filter((r) => r.attendanceDate).length;
    return (
      <>
        {renderHeader("Minha frequência")}

        <section className="at-student-hero">
          <div
            className={`at-student-today ${todayRecord ? "present" : ""}`}
          >
            <div className="at-student-today-icon">
              <Icon
                fafa={todayRecord ? "faCircleCheck" : "faCircleXmark"}
                width={28}
              />
            </div>
            <div>
              <strong>{todayRecord ? "Presente hoje" : "Sem registro hoje"}</strong>
              {todayRecord ? (
                <span>
                  Primeiro acesso às {formatTime(todayRecord.firstLoginAt)}
                </span>
              ) : (
                <span>Nenhum login registrado ainda</span>
              )}
            </div>
          </div>
          <div className="at-student-stat-row">
            <div className="at-student-stat">
              <span>Total de presenças</span>
              <strong>{presentCount}</strong>
            </div>
            <div className="at-student-stat">
              <span>Logins registrados</span>
              <strong>
                {studentRecords.reduce(
                  (sum, r) => sum + Number(r.loginCount || 0),
                  0
                )}
              </strong>
            </div>
          </div>
        </section>

        <section className="at-panel">
          <div className="at-panel-head">
            <h2>Últimos 7 dias</h2>
          </div>
          <div className="at-panel-body">
            <WeekCalendar records={studentRecords} />
          </div>
        </section>

        <section className="at-panel">
          <div className="at-panel-head">
            <h2>Presenças recentes</h2>
            <span className="at-panel-sub">últimas 10</span>
          </div>
          {renderStudentHistoryTable(studentRecords.slice(0, 10))}
        </section>
      </>
    );
  };

  /* ── Tabela de histórico do aluno ────────────────────── */
  const renderStudentHistoryCards = (items = studentRecords) => (
    <div className="attendance-card-list attendance-mobile-only">
      {items.map((record) => (
        <article className="attendance-mobile-card compact" key={record.id}>
          <header>
            <div>
              <strong>{formatDate(record.attendanceDate)}</strong>
              <span>{record.loginCount} login{Number(record.loginCount) !== 1 ? "s" : ""}</span>
            </div>
          </header>
          <dl>
            <div>
              <dt>Primeiro acesso</dt>
              <dd>{formatDateTime(record.firstLoginAt)}</dd>
            </div>
          </dl>
        </article>
      ))}
      {items.length === 0 && !loading ? (
        <div className="at-empty">
          <Icon fafa="faCalendarXmark" width={28} />
          <p>Nenhuma presença registrada ainda.</p>
        </div>
      ) : null}
    </div>
  );

  const renderStudentHistoryTable = (items = studentRecords) => (
    <>
      <div className="attendance-table-wrap attendance-desktop-table win11Scroll">
        <table className="attendance-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Primeiro acesso</th>
              <th>Logins</th>
            </tr>
          </thead>
          <tbody>
            {items.map((record) => (
              <tr key={record.id}>
                <td>{formatDate(record.attendanceDate)}</td>
                <td>{formatDateTime(record.firstLoginAt)}</td>
                <td>{record.loginCount}</td>
              </tr>
            ))}
            {items.length === 0 && !loading ? (
              <tr>
                <td colSpan={3}>
                  <div className="at-empty">
                    <Icon fafa="faCalendarXmark" width={28} />
                    <p>Nenhuma presença registrada ainda.</p>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {renderStudentHistoryCards(items)}
    </>
  );

  /* ── Histórico completo do aluno ─────────────────────── */
  const renderStudentHistory = () => (
    <>
      {renderHeader("Histórico")}
      <section className="at-panel">
        <div className="at-panel-head">
          <h2>Todos os registros</h2>
          <span className="at-panel-sub">
            {studentRecords.length} presença{studentRecords.length !== 1 ? "s" : ""}
          </span>
        </div>
        {renderStudentHistoryTable()}
      </section>
    </>
  );

  /* ── Relatório de impressão ──────────────────────────── */
  const renderPrintReport = () => {
    if (startDate === endDate) {
      const dayRecords = records.filter(r => r.attendanceDate === startDate);
      return (
        <div className="attendance-print-sheet">
          <h1>Relatório de frequência diária</h1>
          <p>
            Turma: {filteredTurmaName} | Data: {formatDate(startDate)}
          </p>
          <table>
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Turma</th>
                <th>Status</th>
                <th>Acesso</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const record = dayRecords.find(r => r.userId === student.id || r.username === student.username);
                return (
                  <tr key={student.id}>
                    <td>{student.displayName}</td>
                    <td>{student.turmaNome || "Sem turma"}</td>
                    <td>
                      {record ? (
                        <span className="at-badge at-badge--good">Presente</span>
                      ) : (
                        <span className="at-badge at-badge--bad">Ausente</span>
                      )}
                    </td>
                    <td>{record ? formatTime(record.firstLoginAt) : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    return (
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  /* ── Despacho de conteúdo ────────────────────────────── */
  const renderActiveContent = () => {
    if (isProfessor) {
      if (activeTab === "students") return renderStudents();
      if (activeTab === "daily") return renderDaily();
      if (activeTab === "records") return renderRecords();
      if (activeTab === "print") return renderPrint();
      if (activeTab === "register") return renderRegister();
      return renderOverview();
    }

    if (activeTab === "student-history") return renderStudentHistory();
    return renderStudentOverview();
  };

  return (
    <div
      className={`attendance-view ${standalone ? "standalone" : "windowed"}`}
    >
      <div className="attendance-shell">
        {renderSidebar()}
        <main className="attendance-main win11Scroll">
          {loading ? <div className="at-loading-bar" /> : null}
          {message ? <div className="attendance-alert">{message}</div> : null}
          {renderActiveContent()}
        </main>
        {renderMobileNav()}
      </div>
      <section className="attendance-print-report">
        {renderPrintReport()}
      </section>
    </div>
  );
};

export const AttendanceStandalonePage = () => {
  useEffect(() => {
    document.title = "Frequência - WINDUCACIONAL";
  }, []);

  return (
    <main className="attendanceStandalonePage">
      <AttendanceView standalone />
    </main>
  );
};

export const AttendanceApp = () => {
  const wnapp = useSelector((state) => state.apps.attendance);

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
      <AttendanceView visible={!wnapp.hide} />
    </AppWindow>
  );
};
