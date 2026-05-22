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
  const bookletTiles = useMemo(
    () =>
      visibleModules.flatMap((module) =>
        module.files.map((file) => ({
          module,
          file,
          searchText:
            `${module.title} ${module.folderName} ${file.title} ${file.fileName}`.toLowerCase(),
        }))
      ),
    [visibleModules]
  );
  const filteredTiles = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return bookletTiles;
    return bookletTiles.filter((item) => item.searchText.includes(term));
  }, [bookletTiles, search]);

  const selectedModule =
    visibleModules.find((module) => module.id === selectedModuleId) ||
    visibleModules[0] ||
    null;
  const selectedFile =
    selectedModule?.files.find((file) => file.id === selectedFileId) ||
    selectedModule?.files[0] ||
    null;
  const enabledCount = modules.filter((module) => module.enabled).length;

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

  const selectFile = (module, file, openReader = true) => {
    setSelectedModuleId(module.id);
    setSelectedFileId(file.id);
    if (openReader) setActiveTab("reader");
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
      <div className="booklets-actions">
        <button
          className="booklets-secondary"
          type="button"
          onClick={loadModules}
          disabled={loading}
          title="Atualizar"
        >
          <Icon fafa="faRotateRight" width={13} />
          Atualizar
        </button>
        {actions}
      </div>
    </section>
  );

  const renderTilePreview = (file) => (
    <div className="booklets-tile-preview" aria-hidden="true">
      <object
        data={`${file.url}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
        type="application/pdf"
      >
        <div className="booklets-preview-fallback">
          <Icon fafa="faFilePdf" width={30} />
        </div>
      </object>
    </div>
  );

  const renderBookletTile = ({ module, file }) => (
    <div
      key={`${module.id}-${file.id}`}
      role="button"
      tabIndex={0}
      className={`booklets-tile ${
        selectedModule?.id === module.id && selectedFile?.id === file.id
          ? "selected"
          : ""
      }`}
      onClick={() => selectFile(module, file)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectFile(module, file);
        }
      }}
    >
      {renderTilePreview(file)}
      <span>{file.title}</span>
      <small>{module.title}</small>
      <em>{formatBytes(file.size)}</em>
    </div>
  );

  const renderTiles = () => (
    <>
      {renderToolbar()}
      <section className="booklets-tiles win11Scroll">
        {filteredTiles.map(renderBookletTile)}
        {filteredTiles.length === 0 && !loading ? (
          <div className="booklets-empty">Nenhuma apostila encontrada.</div>
        ) : null}
      </section>
    </>
  );

  const renderReaderList = () => (
    <aside className="booklets-reader-list win11Scroll">
      {visibleModules.map((module) => (
        <div className="booklets-reader-module" key={module.id}>
          {module.files.map((file) => (
            <button
              key={file.id}
              type="button"
              className={`booklets-reader-item ${
                selectedModule?.id === module.id && selectedFile?.id === file.id
                  ? "active"
                  : ""
              }`}
              onClick={() => selectFile(module, file, false)}
            >
              <Icon fafa="faFilePdf" width={15} />
              <span>{file.title}</span>
            </button>
          ))}
        </div>
      ))}
    </aside>
  );

  const renderReader = () => (
    <div className="booklets-reader-shell">
      {renderReaderList()}
      <section className="booklets-reader">
        <div className="booklets-reader-bar">
          <div>
            <strong>{selectedFile?.title || "Selecione uma apostila"}</strong>
            <span>{selectedModule?.title || "Apostilas"}</span>
          </div>
          {selectedFile ? (
            <a
              className="booklets-secondary"
              href={selectedFile.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon fafa="faUpRightFromSquare" width={12} />
              Nova aba
            </a>
          ) : null}
        </div>
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
      className="bookletsApp"
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
