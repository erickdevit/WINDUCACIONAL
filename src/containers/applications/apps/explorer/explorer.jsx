import "./explorer.scss";
import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Icon, Image } from "../../../../utils/general";
import { dispatchAction, handleFileOpen } from "../../../../actions";
import "../assets/fileexpo.scss";
import { AppWindow } from "../../../../components/shared/AppWindow";

const NavTitle = (props) => {
  var src = props.icon || "folder";

  return (
    <div
      className="navtitle flex prtclk"
      data-action={props.action}
      data-payload={props.payload}
      onClick={dispatchAction}
    >
      <Icon
        className="mr-1"
        src={"win/" + src + "-sm"}
        width={props.isize || 16}
      />
      <span>{props.title}</span>
    </div>
  );
};

const FolderDrop = ({ dir }) => {
  const files = useSelector((state) => state.files);
  const folder = files.data.getId(dir);

  return (
    <>
      {folder.data &&
        folder.data.map((item, i) => {
          if (item.type == "folder") {
            return (
              <Dropdown
                key={i}
                icon={item.info && item.info.icon}
                title={item.name}
                notoggle={item.data.length == 0}
                dir={item.id}
              />
            );
          }
        })}
    </>
  );
};

const Dropdown = (props) => {
  const [open, setOpen] = useState(props.isDropped != null);
  const special = useSelector((state) => state.files.data.special);
  const [fid, setFID] = useState(() => {
    if (props.spid) return special[props.spid];
    else return props.dir;
  });
  const toggle = () => setOpen(!open);

  return (
    <div className="dropdownmenu">
      <div className="droptitle">
        {!props.notoggle ? (
          <Icon
            className="arrUi"
            fafa={open ? "faChevronDown" : "faChevronRight"}
            width={10}
            onClick={toggle}
            pr
          />
        ) : (
          <Icon className="arrUi opacity-0" fafa="faCircle" width={10} />
        )}
        <NavTitle
          icon={props.icon}
          title={props.title}
          isize={props.isize}
          action={props.action != "" ? props.action || "FILEDIR" : null}
          payload={fid}
        />
        {props.pinned != null ? (
          <Icon className="pinUi" src="win/pinned" width={16} />
        ) : null}
      </div>
      {!props.notoggle ? (
        <div className="dropcontent">
          {open ? props.children : null}
          {open && fid != null ? <FolderDrop dir={fid} /> : null}
        </div>
      ) : null}
    </div>
  );
};

export const Explorer = () => {
  const apps = useSelector((state) => state.apps);
  const wnapp = useSelector((state) => state.apps.explorer);
  const files = useSelector((state) => state.files);
  const fdata = files.data.getId(files.cdir);
  const [cpath, setPath] = useState(files.cpath);
  const [searchtxt, setShText] = useState("");
  const dispatch = useDispatch();

  const handleChange = (e) => setPath(e.target.value);
  const handleSearchChange = (e) => setShText(e.target.value);

  const handleEnter = (e) => {
    if (e.key === "Enter") {
      dispatch({ type: "FILEPATH", payload: cpath });
    }
  };

  const DirCont = () => {
    var arr = [],
      curr = fdata,
      index = 0;

    while (curr) {
      arr.push(
        <div key={index++} className="dirCont flex items-center">
          <div
            className="dncont"
            onClick={dispatchAction}
            tabIndex="-1"
            data-action="FILEDIR"
            data-payload={curr.id}
          >
            {curr.name}
          </div>
          <Icon className="dirchev" fafa="faChevronRight" width={8} />
        </div>
      );

      curr = curr.host;
    }

    arr.push(
      <div key={index++} className="dirCont flex items-center">
        <div className="dncont" tabIndex="-1">
          Este Computador
        </div>
        <Icon className="dirchev" fafa="faChevronRight" width={8} />
      </div>
    );

    arr.push(
      <div key={index++} className="dirCont flex items-center">
        <Icon
          className="pr-1 pb-px"
          src={"win/" + fdata.info.icon + "-sm"}
          width={16}
        />
        <Icon className="dirchev" fafa="faChevronRight" width={8} />
      </div>
    );

    return (
      <div key={index++} className="dirfbox h-full flex">
        {arr.reverse()}
      </div>
    );
  };

  useEffect(() => {
    setPath(files.cpath);
    setShText("");
  }, [files.cpath]);

  return (
    <AppWindow
      wnapp={wnapp}
      app={wnapp.action}
      icon={wnapp.icon}
      name="Explorador de Arquivos"
      className="msfiles"
      windowScreenClassName="flex flex-col"
      restWindowClassName="flex-grow flex flex-col"
      screenTop={<Ribbon />}
    >
      <div className="sec1">
        <Icon
          className={"navIcon hvtheme" + (files.hid == 0 ? " disableIt" : "")}
          fafa="faArrowLeft"
          width={14}
          click="FILEPREV"
          pr
        />
        <Icon
          className={
            "navIcon hvtheme" +
            (files.hid + 1 == files.hist.length ? " disableIt" : "")
          }
          fafa="faArrowRight"
          width={14}
          click="FILENEXT"
          pr
        />
        <Icon
          className="navIcon hvtheme"
          fafa="faArrowUp"
          width={14}
          click="FILEBACK"
          pr
        />
        <div className="path-bar noscroll" tabIndex="-1">
          <input
            className="path-field"
            type="text"
            value={cpath}
            onChange={handleChange}
            onKeyDown={handleEnter}
          />
          <DirCont />
        </div>
        <div className="srchbar">
          <Icon className="searchIcon" src="search" width={12} />
          <input
            type="text"
            onChange={handleSearchChange}
            value={searchtxt}
            placeholder="Pesquisar"
          />
        </div>
      </div>
      <div className="sec2">
        <NavPane />
        <ContentArea searchtxt={searchtxt} />
      </div>
      <div className="sec3">
        <div className="item-count text-xs">
          {fdata.data.length} itens
          {files.saving ? " · salvando" : ""}
          {files.error ? ` · ${files.error}` : ""}
        </div>
        <div className="view-opts flex">
          <Icon
            className="viewicon hvtheme p-1"
            click="FILEVIEW"
            payload="5"
            open={files.view == 5}
            src="win/viewinfo"
            width={16}
          />
          <Icon
            className="viewicon hvtheme p-1"
            click="FILEVIEW"
            payload="1"
            open={files.view == 1}
            src="win/viewlarge"
            width={16}
          />
        </div>
      </div>
    </AppWindow>
  );
};

const ContentArea = ({ searchtxt }) => {
  const files = useSelector((state) => state.files);
  const special = useSelector((state) => state.files.data.special);
  const [selected, setSelect] = useState(null);
  const fdata = files.data.getId(files.cdir);
  const dispatch = useDispatch();

  const handleClick = (e) => {
    e.stopPropagation();
    var el = e.target.closest("[data-id]");
    if (el) setSelect(el.dataset.id);
  };

  const handleDouble = (e) => {
    e.stopPropagation();
    var el = e.target.closest("[data-id]");
    if (el) handleFileOpen(el.dataset.id);
  };

  const emptyClick = (e) => {
    setSelect(null);
  };

  const handleKey = (e) => {
    if (e.key == "Backspace") {
      dispatch({ type: "FILEPREV" });
    } else if (e.key == "Delete" && selected) {
      dispatch({ type: "FILEDELETE_START", payload: selected });
      setSelect(null);
    }
  };

  return (
    <div
      className="contentarea"
      onClick={emptyClick}
      onKeyDown={handleKey}
      tabIndex="-1"
      data-menu="explorer"
    >
      <div className="contentwrap win11Scroll">
        <div className="gridshow" data-size="lg">
          {fdata.data.map((item, i) => {
            return (
              item.name.includes(searchtxt) && (
                <div
                  key={i}
                  className="conticon hvtheme flex flex-col items-center relative"
                  data-id={item.id}
                  data-focus={selected == item.id}
                  onClick={handleClick}
                  onDoubleClick={handleDouble}
                  data-menu="explorerItem"
                >
                  <Image src={`icon/win/${item.info.icon}`} />
                  {files.renamingId === item.id ? (
                    <input
                      type="text"
                      defaultValue={item.name}
                      autoFocus
                      className="text-gray-900 px-1 text-center bg-white border border-blue-500 rounded outline-none w-[120%] text-xs absolute bottom-0 shadow-lg z-10"
                      onBlur={(e) => {
                        if (
                          e.target.value.trim() &&
                          e.target.value !== item.name
                        ) {
                          dispatch({
                            type: "FILERENAME",
                            payload: {
                              id: item.id,
                              name: e.target.value.trim(),
                            },
                          });
                        } else {
                          dispatch({ type: "FILERENAME_END" });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.target.blur();
                        } else if (e.key === "Escape") {
                          e.target.value = item.name;
                          dispatch({ type: "FILERENAME_END" });
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                      onContextMenu={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span>{item.name}</span>
                  )}
                </div>
              )
            );
          })}
        </div>
        {fdata.data.length == 0 ? (
          <span className="text-xs mx-auto">Esta pasta está vazia.</span>
        ) : null}
      </div>

      {files.deleteConfirmId &&
        (() => {
          const deleteItem = files.data.getId(files.deleteConfirmId);
          if (!deleteItem) return null;
          return (
            <div
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-gray-700 p-6 rounded-lg shadow-xl w-80 text-center flex flex-col items-center">
                <Icon fafa="trash" width={32} className="text-red-500 mb-4" />
                <h3 className="font-bold text-lg mb-2 dark:text-white">
                  Excluir item
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                  Tem certeza que deseja excluir "{deleteItem.name}"
                  permanentemente?
                </p>
                <div className="flex space-x-3 w-full justify-center">
                  <button
                    className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors dark:text-white font-medium"
                    onClick={() => dispatch({ type: "FILEDELETE_CANCEL" })}
                  >
                    Cancelar
                  </button>
                  <button
                    className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors font-medium"
                    onClick={() =>
                      dispatch({ type: "FILEDELETE", payload: deleteItem.id })
                    }
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
};

const NavPane = ({}) => {
  const files = useSelector((state) => state.files);
  const currentUser = useSelector((state) => state.setting.person);

  return (
    <div className="navpane win11Scroll">
      <div className="extcont">
        <Dropdown icon="star" title="Acesso rápido" action="" isDropped>
          <Dropdown
            icon="down"
            title="Downloads"
            spid="%downloads%"
            notoggle
            pinned
          />
          <Dropdown
            icon="user"
            title={currentUser.username}
            spid="%user%"
            notoggle
            pinned
          />
          <Dropdown
            icon="docs"
            title="Documentos"
            spid="%documents%"
            notoggle
            pinned
          />
          <Dropdown icon="pics" title="Imagens" spid="%pictures%" notoggle />
        </Dropdown>
        <Dropdown icon="onedrive" title="OneDrive" spid="%onedrive%" />
        <Dropdown icon="thispc" title="Este Computador" action="" isDropped>
          <Dropdown icon="desk" title="Área de Trabalho" spid="%desktop%" />
          <Dropdown icon="docs" title="Documentos" spid="%documents%" />
          <Dropdown icon="down" title="Downloads" spid="%downloads%" />
          <Dropdown icon="music" title="Músicas" spid="%music%" />
          <Dropdown icon="pics" title="Imagens" spid="%pictures%" />
          <Dropdown icon="vid" title="Vídeos" spid="%videos%" />
          <Dropdown icon="disc" title="OS (C:)" spid="%cdrive%" />
          {currentUser.role === "professor" ? (
            <Dropdown
              icon="folder"
              title="Usuários"
              dir={files.data.parsePath("C:\\Users")}
            />
          ) : null}
          <Dropdown icon="disk" title="Dados (D:)" spid="%ddrive%" />
        </Dropdown>
      </div>
    </div>
  );
};

const Ribbon = ({}) => {
  const dispatch = useDispatch();
  const files = useSelector((state) => state.files);

  const handleNew = () => {
    var name = prompt("Nome da pasta:", "Nova Pasta");
    if (name) dispatch({ type: "FILENEWFOLDER", payload: name });
  };

  const handleCut = () => {
    alert("Clique com o botão direito em um item e selecione Recortar.");
  };

  const handleCopy = () => {
    alert("Clique com o botão direito em um item e selecione Copiar.");
  };

  const handlePaste = () => {
    dispatch({ type: "FILEPASTE" });
  };

  const handleRename = () => {
    alert("Clique com o botão direito em um item e selecione Renomear.");
  };

  return (
    <div className="msribbon flex">
      <div className="ribsec">
        <div className="drdwcont flex handcr" onClick={handleNew}>
          <Icon src="new" ui width={18} margin="0 6px" />
          <span>Novo</span>
        </div>
      </div>
      <div className="ribsec">
        <Icon
          className="handcr"
          src="cut"
          ui
          width={18}
          margin="0 6px"
          onClick={handleCut}
        />
        <Icon
          className="handcr"
          src="copy"
          ui
          width={18}
          margin="0 6px"
          onClick={handleCopy}
        />
        <Icon
          className="handcr"
          src="paste"
          ui
          width={18}
          margin="0 6px"
          onClick={handlePaste}
        />
        <Icon
          className="handcr"
          src="rename"
          ui
          width={18}
          margin="0 6px"
          onClick={handleRename}
        />
        <Icon src="share" ui width={18} margin="0 6px" />
      </div>
      <div className="ribsec">
        <div className="drdwcont flex">
          <Icon src="sort" ui width={18} margin="0 6px" />
          <span>Classificar</span>
        </div>
        <div className="drdwcont flex">
          <Icon src="view" ui width={18} margin="0 6px" />
          <span>Exibir</span>
        </div>
      </div>
    </div>
  );
};
