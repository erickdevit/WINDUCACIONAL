import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Icon, Image } from "../../../utils/general";
import "./assets/filedialog.scss";

// ────────────────────────────────────────────────────────────
// Painel de navegação lateral (espelha o NavPane do Explorer)
// ────────────────────────────────────────────────────────────
const DialogNavItem = ({ icon, label, targetId, currentId, onNavigate }) => {
  const active = currentId === targetId;
  return (
    <div
      className={"fdlg-navitem" + (active ? " active" : "")}
      onDoubleClick={() => onNavigate(targetId)}
      onClick={() => onNavigate(targetId)}
      title={label}
    >
      <Icon src={`win/${icon}-sm`} width={16} />
      <span>{label}</span>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Área de conteúdo: lista pastas e arquivos
// ────────────────────────────────────────────────────────────
const DialogContent = ({ cdir, mode, onNavigate, onSelectFile }) => {
  const files = useSelector((state) => state.files);
  const folder = files.data.getId(cdir);
  const [selected, setSelected] = useState(null);

  if (!folder) return null;

  const folders = folder.data
    ? folder.data.filter((x) => x.type === "folder")
    : [];
  const fileItems = folder.data
    ? folder.data.filter((x) => x.type !== "folder")
    : [];

  const handleClick = (item) => {
    setSelected(item.id);
    if (item.type !== "folder" && onSelectFile) {
      onSelectFile(item.name);
    }
  };

  const handleDoubleClick = (item) => {
    if (item.type === "folder") {
      onNavigate(item.id);
      setSelected(null);
    } else if (onSelectFile) {
      onSelectFile(item.name);
    }
  };

  return (
    <div className="fdlg-content win11Scroll">
      <div className="fdlg-grid">
        {folders.map((item) => (
          <div
            key={item.id}
            className={"fdlg-item" + (selected === item.id ? " selected" : "")}
            onClick={() => handleClick(item)}
            onDoubleClick={() => handleDoubleClick(item)}
            title={item.name}
          >
            <Icon src="win/folder-sm" width={40} />
            <span>{item.name}</span>
          </div>
        ))}
        {fileItems.map((item) => (
          <div
            key={item.id}
            className={
              "fdlg-item" +
              (selected === item.id ? " selected" : "") +
              (mode === "save" ? " fdlg-item--dim" : "")
            }
            onClick={() => handleClick(item)}
            onDoubleClick={() => handleDoubleClick(item)}
            title={item.name}
          >
            <Image
              src={`icon/win/${
                item.info && item.info.icon ? item.info.icon : "textfile"
              }`}
              width={40}
            />
            <span>{item.name}</span>
          </div>
        ))}
        {folders.length === 0 && fileItems.length === 0 && (
          <div className="fdlg-empty">Esta pasta está vazia.</div>
        )}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Breadcrumb bar (caminho atual clicável)
// ────────────────────────────────────────────────────────────
const BreadcrumbBar = ({ cdir, onNavigate }) => {
  const files = useSelector((state) => state.files);
  const folder = files.data.getId(cdir);
  if (!folder) return null;

  // Constrói o caminho da raiz até a pasta atual
  const crumbs = [];
  let curr = folder;
  while (curr) {
    crumbs.unshift(curr);
    curr = curr.host;
  }

  return (
    <div className="fdlg-breadcrumb win11Scroll">
      {crumbs.map((c, i) => (
        <React.Fragment key={c.id}>
          <span
            className="fdlg-crumb"
            onClick={() => onNavigate(c.id)}
            title={c.name}
          >
            {c.name}
          </span>
          {i < crumbs.length - 1 && (
            <Icon className="fdlg-crumb-sep" fafa="faChevronRight" width={8} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Componente principal: FileDialog
// ────────────────────────────────────────────────────────────
export const FileDialog = () => {
  const dispatch = useDispatch();
  const files = useSelector((state) => state.files);
  const dialog = files.fileDialog;
  const currentUser = useSelector((state) => state.setting.person);

  // Estado local do nome do arquivo (sincronizado com o Redux quando o diálogo abre)
  const [localFileName, setLocalFileName] = useState("");

  useEffect(() => {
    if (dialog) {
      setLocalFileName(dialog.fileName || "Sem Título");
    }
  }, [dialog]);

  const handleNavigate = useCallback(
    (id) => {
      dispatch({ type: "FILEDIALOG_NAVIGATE", payload: id });
    },
    [dispatch]
  );

  const handleBack = () => {
    if (!dialog) return;
    const folder = files.data.getId(dialog.cdir);
    if (folder && folder.host) {
      handleNavigate(folder.host.id);
    }
  };

  const handleClose = () => {
    dispatch({ type: "FILEDIALOG_CLOSE" });
  };

  const handleAction = () => {
    if (!dialog) return;
    const name = localFileName.trim() || "Sem Título";
    if (dialog.mode === "open") {
      // No modo abrir, apenas fecha o diálogo mantendo cdir e fileName
      // para que o componente chamador (ex.: chat) possa ler o arquivo
      dispatch({
        type: "FILEDIALOG_CLOSE",
        payload: {
          cdir: dialog.cdir,
          fileName: name,
          caller: dialog.caller,
        },
      });
    } else {
      dispatch({
        type: "FILEDIALOG_SAVE",
        payload: {
          parentId: dialog.cdir,
          fileName: name,
          content: dialog.content || "",
          ext: dialog.ext || "txt",
        },
      });
    }
  };

  const handleSelectFile = (name) => {
    const ext = dialog.ext || "txt";
    const regex = new RegExp(`\\.${ext}$`, "i");
    setLocalFileName(name.replace(regex, ""));
  };

  if (!dialog) return null;

  // Resolve atalhos especiais para IDs reais
  const resolveId = (spid) => {
    if (!spid) return null;
    if (spid.includes("%")) return files.data.special[spid] || null;
    return spid;
  };

  const sp = files.data.special;

  const title = dialog.mode === "save" ? "Salvar Como" : "Abrir";

  return (
    <div className="fdlg-overlay" onClick={handleClose}>
      <div
        className="fdlg-window dpShad"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
        aria-modal="true"
      >
        {/* Barra de título */}
        <div className="fdlg-titlebar">
          <div className="fdlg-title">{title}</div>
          <div className="fdlg-close" onClick={handleClose} title="Fechar">
            <Icon fafa="faTimes" width={10} />
          </div>
        </div>

        {/* Barra de navegação */}
        <div className="fdlg-navbar">
          <button
            className="fdlg-navbtn"
            onClick={handleBack}
            title="Voltar"
            disabled={!files.data.getId(dialog.cdir)?.host}
          >
            <Icon fafa="faArrowLeft" width={12} />
          </button>
          <BreadcrumbBar cdir={dialog.cdir} onNavigate={handleNavigate} />
        </div>

        {/* Corpo principal: NavPane + conteúdo */}
        <div className="fdlg-body">
          {/* Painel lateral */}
          <div className="fdlg-navpane win11Scroll">
            <div className="fdlg-nav-section">Acesso rápido</div>
            <DialogNavItem
              icon="down"
              label="Downloads"
              targetId={resolveId("%downloads%")}
              currentId={dialog.cdir}
              onNavigate={handleNavigate}
            />
            <DialogNavItem
              icon="user"
              label={currentUser.username || "Usuário"}
              targetId={resolveId("%user%")}
              currentId={dialog.cdir}
              onNavigate={handleNavigate}
            />
            <DialogNavItem
              icon="docs"
              label="Documentos"
              targetId={resolveId("%documents%")}
              currentId={dialog.cdir}
              onNavigate={handleNavigate}
            />
            <DialogNavItem
              icon="pics"
              label="Imagens"
              targetId={resolveId("%pictures%")}
              currentId={dialog.cdir}
              onNavigate={handleNavigate}
            />
            <div className="fdlg-nav-section">Este Computador</div>
            <DialogNavItem
              icon="desk"
              label="Área de Trabalho"
              targetId={resolveId("%desktop%")}
              currentId={dialog.cdir}
              onNavigate={handleNavigate}
            />
            <DialogNavItem
              icon="music"
              label="Músicas"
              targetId={resolveId("%music%")}
              currentId={dialog.cdir}
              onNavigate={handleNavigate}
            />
            <DialogNavItem
              icon="vid"
              label="Vídeos"
              targetId={resolveId("%videos%")}
              currentId={dialog.cdir}
              onNavigate={handleNavigate}
            />
            <DialogNavItem
              icon="disc"
              label="OS (C:)"
              targetId={resolveId("%cdrive%")}
              currentId={dialog.cdir}
              onNavigate={handleNavigate}
            />
            <DialogNavItem
              icon="disk"
              label="Dados (D:)"
              targetId={resolveId("%ddrive%")}
              currentId={dialog.cdir}
              onNavigate={handleNavigate}
            />
          </div>

          {/* Área de conteúdo */}
          <DialogContent
            cdir={dialog.cdir}
            mode={dialog.mode}
            onNavigate={handleNavigate}
            onSelectFile={handleSelectFile}
          />
        </div>

        {/* Rodapé: campo de nome + botões */}
        <div className="fdlg-footer">
          <div className="fdlg-footer-row">
            <label className="fdlg-label">Nome do arquivo:</label>
            <input
              id="fdlg-filename"
              type="text"
              className="fdlg-input"
              value={localFileName}
              onChange={(e) => setLocalFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAction();
                if (e.key === "Escape") handleClose();
              }}
              autoFocus
              placeholder="Sem Título"
            />
            <label className="fdlg-label fdlg-label--type">Tipo:</label>
            <div className="fdlg-typebox">
              {dialog.ext === "docx"
                ? "Documento do Word (*.docx)"
                : `Documentos de texto (*.${dialog.ext || "txt"})`}
            </div>
          </div>
          <div className="fdlg-footer-btns">
            <button
              id="fdlg-btn-cancel"
              className="fdlg-btn fdlg-btn--secondary"
              onClick={handleClose}
            >
              Cancelar
            </button>
            <button
              id="fdlg-btn-save"
              className="fdlg-btn fdlg-btn--primary"
              onClick={handleAction}
            >
              {dialog.mode === "save" ? "Salvar" : "Abrir"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileDialog;
