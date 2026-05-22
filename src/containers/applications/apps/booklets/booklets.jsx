import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { AppWindow } from "../../../../components/shared/AppWindow";
import { api } from "../../../../lib/api";
import { Icon } from "../../../../utils/general";
import "./booklets.scss";

const professorTabs = [
  { id: "library", label: "Apostilas", icon: "faBookOpen" },
  { id: "access", label: "Permissões", icon: "faLockOpen" },
];

const studentTabs = [
  { id: "shelf", label: "Apostilas", icon: "faBook" },
  { id: "reader", label: "Leitor", icon: "faFilePdf" },
];

const formatBytes = (value) => {
  const size = Number(value || 0);
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

export const BookletsApp = () => {
  const wnapp = useSelector((state) => state.apps.booklets || {});
  const user = useSelector((state) => state.setting.person);
  const isProfessor = user.role === "professor";

  const [modules, setModules] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [studentAccess, setStudentAccess] = useState([]);
  const [activeTab, setActiveTab] = useState(isProfessor ? "library" : "shelf");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [selectedFileId, setSelectedFileId] = useState("");
  const [selectedAccessTurmaId, setSelectedAccessTurmaId] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [selectedStudentModuleIds, setSelectedStudentModuleIds] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingStudentAccess, setSavingStudentAccess] = useState(false);
  const [message, setMessage] = useState("");

  const tabs = isProfessor ? professorTabs : studentTabs;
  const visibleModules = useMemo(
    () => (isProfessor ? modules : modules.filter((module) => module.enabled)),
    [isProfessor, modules]
  );
  const selectedModule =
    visibleModules.find((module) => module.id === selectedModuleId) ||
    visibleModules[0] ||
    null;
  const selectedFile =
    selectedModule?.files.find((file) => file.id === selectedFileId) ||
    selectedModule?.files[0] ||
    null;
  const bookletTiles = useMemo(
    () =>
      (selectedModule?.files || []).map((file) => ({
        module: selectedModule,
        file,
        searchText:
          `${selectedModule.title} ${selectedModule.folderName} ${file.title} ${file.fileName}`.toLowerCase(),
      })),
    [selectedModule]
  );
  const filteredTiles = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return bookletTiles;
    return bookletTiles.filter((item) => item.searchText.includes(term));
  }, [bookletTiles, search]);
  const enabledCount = modules.filter((module) => module.enabled).length;
  const selectedAccessStudents = useMemo(
    () =>
      studentAccess.filter((student) =>
        selectedStudentIds.includes(student.id)
      ),
    [studentAccess, selectedStudentIds]
  );

  const loadModules = async () => {
    setLoading(true);
    setMessage("");
    try {
      if (isProfessor) {
        const [moduleData, turmaData, accessData] = await Promise.all([
          api.getBookletModules(),
          api.getTurmas(),
          api.getBookletStudentAccess({ turmaId: selectedAccessTurmaId }),
        ]);
        setModules(moduleData.modules || []);
        setTurmas(turmaData.turmas || []);
        setStudentAccess(accessData.students || []);
        return;
      }

      const data = await api.getBookletModules();
      setModules(data.modules || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setActiveTab(isProfessor ? "library" : "shelf");
  }, [isProfessor]);

  useEffect(() => {
    if (wnapp.hide) return;
    loadModules();
  }, [wnapp.hide]);

  useEffect(() => {
    if (wnapp.hide || !isProfessor) return;

    const loadAccess = async () => {
      setMessage("");
      try {
        const data = await api.getBookletStudentAccess({
          turmaId: selectedAccessTurmaId,
        });
        setStudentAccess(data.students || []);
        setSelectedStudentIds((current) => {
          const visibleIds = new Set(
            (data.students || []).map((item) => item.id)
          );
          return current.filter((id) => visibleIds.has(id));
        });
      } catch (error) {
        setMessage(error.message);
      }
    };

    loadAccess();
  }, [selectedAccessTurmaId, isProfessor, wnapp.hide]);

  useEffect(() => {
    if (visibleModules.length === 0) {
      setSelectedModuleId("");
      setSelectedFileId("");
      return;
    }

    const nextModule =
      visibleModules.find((module) => module.id === selectedModuleId) ||
      visibleModules[0];
    setSelectedModuleId(nextModule.id);

    if (!nextModule.files.some((file) => file.id === selectedFileId)) {
      setSelectedFileId(nextModule.files[0]?.id || "");
    }
  }, [visibleModules, selectedModuleId, selectedFileId]);

  useEffect(() => {
    if (selectedAccessStudents.length === 0) {
      setSelectedStudentModuleIds([]);
      return;
    }

    const sharedModuleIds = modules
      .filter((module) =>
        selectedAccessStudents.every((student) =>
          student.moduleIds.includes(module.id)
        )
      )
      .map((module) => module.id);
    setSelectedStudentModuleIds(sharedModuleIds);
  }, [selectedAccessStudents, modules]);

  const selectFile = (module, file, openReader = true) => {
    setSelectedModuleId(module.id);
    setSelectedFileId(file.id);
    if (openReader) setActiveTab("reader");
  };

  const selectModule = (module) => {
    setSelectedModuleId(module.id);
    setSelectedFileId(module.files[0]?.id || "");
  };

  const toggleModuleAccess = (moduleId) => {
    setModules((current) =>
      current.map((module) =>
        module.id === moduleId
          ? { ...module, enabled: !module.enabled }
          : module
      )
    );
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    );
  };

  const toggleStudentModuleAccess = (moduleId) => {
    setSelectedStudentModuleIds((current) =>
      current.includes(moduleId)
        ? current.filter((id) => id !== moduleId)
        : [...current, moduleId]
    );
  };

  const setAllAccess = (enabled) => {
    setModules((current) =>
      current.map((module) => ({
        ...module,
        enabled,
      }))
    );
  };

  const saveAccess = async () => {
    setSaving(true);
    setMessage("");
    try {
      const enabledModuleIds = modules
        .filter((module) => module.enabled)
        .map((module) => module.id);
      const data = await api.saveBookletAccess(enabledModuleIds);
      setModules(data.modules || []);
      setMessage("Permissões de apostilas salvas.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const saveStudentAccess = async () => {
    setSavingStudentAccess(true);
    setMessage("");
    try {
      const data = await api.saveBookletStudentAccess({
        turmaId: selectedAccessTurmaId,
        userIds: selectedStudentIds,
        moduleIds: selectedStudentModuleIds,
      });
      setStudentAccess(data.students || []);
      setMessage("Liberação específica salva.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSavingStudentAccess(false);
    }
  };

  const renderSidebar = () => (
    <aside className="booklets-sidebar">
      <div className="booklets-brand">
        <Icon src="booklets" width={24} />
      </div>

      <nav className="booklets-nav win11Scroll">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`booklets-nav-button ${
              activeTab === tab.id ? "active" : ""
            }`}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
          >
            <Icon fafa={tab.icon} width={15} />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );

  const renderToolbar = (actions = null) => (
    <section className="booklets-toolbar">
      <label className="booklets-search">
        <Icon fafa="faMagnifyingGlass" width={13} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar apostila"
        />
      </label>
      {actions ? <div className="booklets-actions">{actions}</div> : null}
    </section>
  );

  const renderModuleSelector = () => (
    <section className="booklets-module-selector win11Scroll">
      <select
        className="booklets-module-select"
        value={selectedModule?.id || ""}
        onChange={(event) => {
          const module = visibleModules.find(
            (item) => item.id === event.target.value
          );
          if (module) selectModule(module);
        }}
        disabled={visibleModules.length === 0}
        aria-label="Selecionar módulo"
      >
        {visibleModules.length === 0 ? (
          <option value="">Nenhum módulo disponível</option>
        ) : null}
        {visibleModules.map((module) => (
          <option key={module.id} value={module.id}>
            {module.title} ({module.files.length})
          </option>
        ))}
      </select>
      {visibleModules.map((module) => (
        <button
          key={module.id}
          type="button"
          className={`booklets-module-chip ${
            selectedModule?.id === module.id ? "active" : ""
          }`}
          onClick={() => selectModule(module)}
        >
          <Icon fafa="faLayerGroup" width={14} />
          <span>{module.title}</span>
          <small>{module.files.length}</small>
        </button>
      ))}
    </section>
  );

  const renderTilePreview = (module, file, isSelected) => (
    <div className="booklets-tile-preview" aria-hidden="true">
      {isSelected ? (
        <object
          data={`${file.url}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
          type="application/pdf"
        >
          <div className="booklets-preview-fallback">
            <Icon fafa="faFilePdf" width={30} />
          </div>
        </object>
      ) : (
        <div className="booklets-cover-preview">
          <div className="booklets-cover-spine" />
          <div className="booklets-cover-content">
            <Icon fafa="faFilePdf" width={24} />
            <strong>{file.title}</strong>
            <span>{module.title}</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderBookletTile = ({ module, file }) => {
    const isSelected =
      selectedModule?.id === module.id && selectedFile?.id === file.id;

    return (
      <div
        key={`${module.id}-${file.id}`}
        role="button"
        tabIndex={0}
        className={`booklets-tile ${isSelected ? "selected" : ""}`}
        onClick={() => selectFile(module, file)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectFile(module, file);
          }
        }}
      >
        {renderTilePreview(module, file, isSelected)}
        <span>{file.title}</span>
        <small>{module.title}</small>
        <em>{formatBytes(file.size)}</em>
      </div>
    );
  };

  const renderTiles = () => (
    <>
      {renderToolbar()}
      {renderModuleSelector()}
      <section className="booklets-tiles win11Scroll">
        {filteredTiles.map(renderBookletTile)}
        {filteredTiles.length === 0 && !loading ? (
          <div className="booklets-empty">Nenhuma apostila encontrada.</div>
        ) : null}
      </section>
    </>
  );

  const renderReader = () => (
    <div className="booklets-reader-shell">
      <section className="booklets-reader">
        <div className="booklets-pdf-scroll win11Scroll">
          {selectedFile ? (
            <object
              key={selectedFile.url}
              data={`${selectedFile.url}#toolbar=1&navpanes=0&view=FitH`}
              type="application/pdf"
              className="booklets-pdf-object"
            >
              <iframe
                src={selectedFile.url}
                title={selectedFile.title}
                className="booklets-pdf-object"
              />
            </object>
          ) : (
            <div className="booklets-empty">Escolha um PDF para leitura.</div>
          )}
        </div>
      </section>
    </div>
  );

  const renderAccess = () => (
    <>
      <section className="booklets-access-toolbar">
        <div className="booklets-access-counter">
          <span>{enabledCount}</span>
          <small>/ {modules.length}</small>
        </div>
        <div className="booklets-access-actions">
          <button type="button" onClick={() => setAllAccess(true)}>
            Liberar todos
          </button>
          <button type="button" onClick={() => setAllAccess(false)}>
            Bloquear todos
          </button>
          <button
            className="booklets-primary"
            type="button"
            onClick={saveAccess}
            disabled={saving}
          >
            <Icon fafa="faFloppyDisk" width={13} />
            Salvar
          </button>
        </div>
      </section>
      <div className="booklets-access-layout">
        <section className="booklets-access-list win11Scroll">
          {modules.map((module) => (
            <label className="booklets-access-row" key={module.id}>
              <input
                type="checkbox"
                checked={module.enabled}
                onChange={() => toggleModuleAccess(module.id)}
              />
              <div>
                <strong>{module.title}</strong>
                <span>
                  {module.files.length} apostila(s) em {module.folderName}
                </span>
              </div>
              <em>{module.enabled ? "Liberado" : "Bloqueado"}</em>
            </label>
          ))}
        </section>

        <section className="booklets-student-access">
          <div className="booklets-student-filter">
            <select
              value={selectedAccessTurmaId}
              onChange={(event) => {
                setSelectedAccessTurmaId(event.target.value);
                setSelectedStudentIds([]);
              }}
            >
              <option value="">Todas as turmas</option>
              {turmas.map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.nome}
                </option>
              ))}
            </select>
            <button
              className="booklets-primary"
              type="button"
              onClick={saveStudentAccess}
              disabled={savingStudentAccess || selectedStudentIds.length === 0}
            >
              <Icon fafa="faFloppyDisk" width={13} />
              Salvar alunos
            </button>
          </div>

          <div className="booklets-student-access-grid">
            <div className="booklets-student-list win11Scroll">
              {studentAccess.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  className={`booklets-student-row ${
                    selectedStudentIds.includes(student.id) ? "active" : ""
                  }`}
                  onClick={() => toggleStudentSelection(student.id)}
                >
                  <strong>{student.displayName}</strong>
                  <span>
                    {student.turmaNome} · @{student.username}
                  </span>
                </button>
              ))}
              {studentAccess.length === 0 && !loading ? (
                <div className="booklets-empty">Nenhum aluno encontrado.</div>
              ) : null}
            </div>

            <div className="booklets-student-module-list win11Scroll">
              {modules.map((module) => (
                <label className="booklets-student-module-row" key={module.id}>
                  <input
                    type="checkbox"
                    checked={selectedStudentModuleIds.includes(module.id)}
                    disabled={selectedStudentIds.length === 0}
                    onChange={() => toggleStudentModuleAccess(module.id)}
                  />
                  <div>
                    <strong>{module.title}</strong>
                    <span>
                      {module.enabled
                        ? "Liberado para todos"
                        : "Liberação individual"}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );

  const renderContent = () => {
    if (isProfessor && activeTab === "access") return renderAccess();
    if (activeTab === "reader") return renderReader();
    return renderTiles();
  };

  return (
    <AppWindow
      wnapp={wnapp}
      app={wnapp.action}
      icon={wnapp.icon}
      name="Apostilas"
      className={`bookletsApp ${activeTab === "reader" ? "readerMode" : ""}`}
      toolbarProps={{ bg: "#ffffff", noinvert: true }}
      windowScreenClassName="flex flex-col"
      restWindowClassName="flex-grow flex flex-col"
    >
      <div className="booklets-shell">
        {renderSidebar()}
        <main className="booklets-main">
          {message ? <div className="booklets-alert">{message}</div> : null}
          {loading ? (
            <div className="booklets-loading">Carregando...</div>
          ) : null}
          {renderContent()}
        </main>
      </div>
    </AppWindow>
  );
};
