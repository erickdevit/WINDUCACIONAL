import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { AppWindow } from "../../../../components/shared/AppWindow";
import { api } from "../../../../lib/api";
import { Icon } from "../../../../utils/general";
import "./booklets.scss";

const professorTabs = [
  { id: "library", label: "Biblioteca", icon: "faBookOpen" },
  { id: "access", label: "Permissões", icon: "faLockOpen" },
];

const studentTabs = [
  { id: "shelf", label: "Estante", icon: "faBook" },
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
  const [activeTab, setActiveTab] = useState(isProfessor ? "library" : "shelf");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [selectedFileId, setSelectedFileId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const tabs = isProfessor ? professorTabs : studentTabs;
  const visibleModules = useMemo(
    () => (isProfessor ? modules : modules.filter((module) => module.enabled)),
    [isProfessor, modules]
  );
  const filteredModules = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return visibleModules;
    return visibleModules.filter(
      (module) =>
        module.title.toLowerCase().includes(term) ||
        module.folderName.toLowerCase().includes(term) ||
        module.files.some((file) => file.title.toLowerCase().includes(term))
    );
  }, [search, visibleModules]);

  const selectedModule =
    visibleModules.find((module) => module.id === selectedModuleId) ||
    visibleModules[0] ||
    null;
  const selectedFile =
    selectedModule?.files.find((file) => file.id === selectedFileId) ||
    selectedModule?.files[0] ||
    null;
  const enabledCount = modules.filter((module) => module.enabled).length;
  const totalFiles = visibleModules.reduce(
    (total, module) => total + module.files.length,
    0
  );

  const loadModules = async () => {
    setLoading(true);
    setMessage("");
    try {
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

  const selectFile = (module, file) => {
    setSelectedModuleId(module.id);
    setSelectedFileId(file.id);
    if (!isProfessor) setActiveTab("reader");
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

  const renderSidebar = () => (
    <aside className="booklets-sidebar">
      <div className="booklets-brand">
        <Icon src="booklets" width={28} />
        <div>
          <strong>Apostilas</strong>
          <span>{isProfessor ? "Gestão de acesso" : "Biblioteca virtual"}</span>
        </div>
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
          >
            <Icon fafa={tab.icon} width={15} />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="booklets-sidebar-stats">
        <span>{visibleModules.length} módulo(s)</span>
        <strong>{totalFiles}</strong>
        <small>apostila(s) em PDF</small>
      </div>
    </aside>
  );

  const renderHeader = (title, description, actions = null) => (
    <header className="booklets-header">
      <div>
        <span className="booklets-kicker">Biblioteca de estudos</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="booklets-actions">
        <button
          className="booklets-secondary"
          type="button"
          onClick={loadModules}
          disabled={loading}
        >
          <Icon fafa="faRotateRight" width={13} />
          Atualizar
        </button>
        {actions}
      </div>
    </header>
  );

  const renderModuleCard = (module) => (
    <button
      key={module.id}
      type="button"
      className={`booklets-module-card ${
        selectedModule?.id === module.id ? "selected" : ""
      } ${module.enabled ? "enabled" : "locked"}`}
      onClick={() => {
        setSelectedModuleId(module.id);
        setSelectedFileId(module.files[0]?.id || "");
      }}
    >
      <div className="booklets-book-cover">
        <Icon fafa="faBookOpen" width={24} />
      </div>
      <div>
        <strong>{module.title}</strong>
        <span>{module.files.length} PDF(s)</span>
        {isProfessor ? (
          <small>{module.enabled ? "Liberado" : "Bloqueado"}</small>
        ) : null}
      </div>
    </button>
  );

  const renderFileList = () => (
    <section className="booklets-panel booklets-file-panel">
      <div className="booklets-panel-head">
        <div>
          <h2>{selectedModule?.title || "Apostilas"}</h2>
          <span>{selectedModule?.folderName || "Selecione um módulo"}</span>
        </div>
      </div>
      <div className="booklets-file-list win11Scroll">
        {selectedModule?.files.map((file) => (
          <button
            key={file.id}
            type="button"
            className={`booklets-file-row ${
              selectedFile?.id === file.id ? "active" : ""
            }`}
            onClick={() => selectFile(selectedModule, file)}
          >
            <Icon fafa="faFilePdf" width={18} />
            <div>
              <strong>{file.title}</strong>
              <span>{formatBytes(file.size)}</span>
            </div>
          </button>
        ))}
        {!selectedModule && !loading ? (
          <div className="booklets-empty">Nenhum módulo disponível.</div>
        ) : null}
      </div>
    </section>
  );

  const renderReader = () => (
    <section className="booklets-reader">
      <div className="booklets-reader-head">
        <div>
          <span>{selectedModule?.title || "Apostilas"}</span>
          <strong>{selectedFile?.title || "Selecione uma apostila"}</strong>
        </div>
        {selectedFile ? (
          <a
            className="booklets-secondary"
            href={selectedFile.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon fafa="faUpRightFromSquare" width={12} />
            Abrir em nova aba
          </a>
        ) : null}
      </div>
      <div className="booklets-pdf-frame">
        {selectedFile ? (
          <iframe
            key={selectedFile.url}
            src={selectedFile.url}
            title={selectedFile.title}
          />
        ) : (
          <div className="booklets-empty">Escolha um PDF para leitura.</div>
        )}
      </div>
    </section>
  );

  const renderShelf = () => (
    <>
      {renderHeader(
        isProfessor ? "Biblioteca de apostilas" : "Minha estante",
        isProfessor
          ? "Confira os módulos disponíveis e abra qualquer PDF para revisão."
          : "Abra os módulos liberados pelo professor e leia as apostilas."
      )}
      <section className="booklets-toolbar">
        <label className="booklets-search">
          <Icon fafa="faMagnifyingGlass" width={13} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar módulo ou apostila"
          />
        </label>
      </section>
      <div className="booklets-library-grid">
        <section className="booklets-panel">
          <div className="booklets-panel-head">
            <div>
              <h2>Módulos</h2>
              <span>{filteredModules.length} encontrado(s)</span>
            </div>
          </div>
          <div className="booklets-module-grid win11Scroll">
            {filteredModules.map(renderModuleCard)}
            {filteredModules.length === 0 && !loading ? (
              <div className="booklets-empty">Nenhuma apostila encontrada.</div>
            ) : null}
          </div>
        </section>
        {renderFileList()}
      </div>
      {isProfessor ? renderReader() : null}
    </>
  );

  const renderAccess = () => (
    <>
      {renderHeader(
        "Permissões dos alunos",
        "Defina quais módulos aparecem na biblioteca dos alunos.",
        <button
          className="booklets-primary"
          type="button"
          onClick={saveAccess}
          disabled={saving}
        >
          <Icon fafa="faFloppyDisk" width={13} />
          Salvar
        </button>
      )}
      <section className="booklets-access-summary">
        <div>
          <span>Liberados</span>
          <strong>
            {enabledCount}/{modules.length}
          </strong>
        </div>
        <div className="booklets-access-actions">
          <button type="button" onClick={() => setAllAccess(true)}>
            Liberar todos
          </button>
          <button type="button" onClick={() => setAllAccess(false)}>
            Bloquear todos
          </button>
        </div>
      </section>
      <section className="booklets-panel">
        <div className="booklets-access-list win11Scroll">
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
              <em>{module.enabled ? "Visível para alunos" : "Oculto"}</em>
            </label>
          ))}
        </div>
      </section>
    </>
  );

  const renderStudentReader = () => (
    <>
      {renderHeader(
        "Leitor de apostilas",
        "Leia o PDF selecionado sem sair da biblioteca."
      )}
      <div className="booklets-reader-layout">
        {renderFileList()}
        {renderReader()}
      </div>
    </>
  );

  const renderContent = () => {
    if (isProfessor && activeTab === "access") return renderAccess();
    if (!isProfessor && activeTab === "reader") return renderStudentReader();
    return renderShelf();
  };

  return (
    <AppWindow
      wnapp={wnapp}
      app={wnapp.action}
      icon={wnapp.icon}
      name="Apostilas"
      className="bookletsApp"
      windowScreenClassName="flex flex-col"
      restWindowClassName="flex-grow flex flex-col"
    >
      <div className="booklets-shell">
        {renderSidebar()}
        <main className="booklets-main win11Scroll">
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
