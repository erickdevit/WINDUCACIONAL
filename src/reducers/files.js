import { Bin } from "../utils/bin";
import fdata from "./dir.json";

const defState = {
  cdir: "%user%",
  hist: [],
  hid: 0,
  view: 1,
  clipboard: null, // { id, mode: 'copy'|'cut' }
  props: null, // item being inspected
  revision: 0, // incremented on mutations to force re-render
  loaded: false,
  saving: false,
  error: null,
  renamingId: null,
  deleteConfirmId: null,
  // Estado do diálogo de arquivo (salvar/abrir) nativo do simulador
  fileDialog: null, // { mode: 'save'|'open', cdir, fileName, caller: 'notepad'|... }
};

defState.hist.push(defState.cdir);
defState.data = new Bin();
defState.data.parse(fdata);

// Helper: generate a unique name if one already exists in the folder
const uniqueName = (parent, baseName) => {
  var existing = parent.data.map((x) => x.name);
  if (!existing.includes(baseName)) return baseName;

  var ext = "";
  var stem = baseName;
  var dotIdx = baseName.lastIndexOf(".");
  if (dotIdx > 0) {
    ext = baseName.substring(dotIdx);
    stem = baseName.substring(0, dotIdx);
  }

  var counter = 1;
  while (existing.includes(stem + " (" + counter + ")" + ext)) {
    counter++;
  }
  return stem + " (" + counter + ")" + ext;
};

const fileReducer = (state = defState, action) => {
  var tmp = { ...state };
  var navHist = false;
  var mutated = false;

  if (action.type === "FILEDIR") {
    tmp.cdir = action.payload;
  } else if (action.type === "FILELOAD") {
    var nextData = new Bin();
    nextData.parse(action.payload);
    tmp.data = nextData;
    tmp.cdir = "%user%";
    tmp.hist = [tmp.cdir];
    tmp.hid = 0;
    tmp.clipboard = null;
    tmp.props = null;
    tmp.loaded = true;
    tmp.error = null;
  } else if (action.type === "FILESAVING") {
    tmp.saving = action.payload;
  } else if (action.type === "FILEERROR") {
    tmp.error = action.payload;
  } else if (action.type === "FILEPATH") {
    var pathid = tmp.data.parsePath(action.payload);
    if (pathid) tmp.cdir = pathid;
  } else if (action.type === "FILEBACK") {
    var item = tmp.data.getId(tmp.cdir);
    if (item.host) {
      tmp.cdir = item.host.id;
    }
  } else if (action.type === "FILEVIEW") {
    tmp.view = action.payload;
  } else if (action.type === "FILEPREV") {
    tmp.hid--;
    if (tmp.hid < 0) tmp.hid = 0;
    navHist = true;
  } else if (action.type === "FILENEXT") {
    tmp.hid++;
    if (tmp.hid > tmp.hist.length - 1) tmp.hid = tmp.hist.length - 1;
    navHist = true;
  } else if (action.type === "FILENEWFOLDER") {
    var parent = tmp.data.getId(tmp.cdir);
    var fname = uniqueName(parent, action.payload || "Nova pasta");
    var newItem = tmp.data.createFolder(tmp.cdir, fname);
    if (newItem) tmp.renamingId = newItem.id;
    mutated = true;
  } else if (action.type === "FILENEWFILE") {
    var parent = tmp.data.getId(tmp.cdir);
    var fname = uniqueName(
      parent,
      action.payload || "Novo documento de texto.txt"
    );
    var newItem = tmp.data.createFile(tmp.cdir, fname, "txt");
    if (newItem) tmp.renamingId = newItem.id;
    mutated = true;
  } else if (action.type === "FILECOPY") {
    tmp.clipboard = { id: action.payload, mode: "copy" };
  } else if (action.type === "FILECUT") {
    tmp.clipboard = { id: action.payload, mode: "cut" };
  } else if (action.type === "FILEPASTE") {
    if (tmp.clipboard) {
      if (tmp.clipboard.mode === "copy") {
        tmp.data.cloneItem(tmp.clipboard.id, tmp.cdir);
        mutated = true;
      } else if (tmp.clipboard.mode === "cut") {
        var cutItem = tmp.data.getId(tmp.clipboard.id);
        if (cutItem) {
          tmp.data.removeItem(tmp.clipboard.id);
          tmp.data.addItem(tmp.cdir, cutItem);
          mutated = true;
        }
        tmp.clipboard = null;
      }
    }
  } else if (action.type === "FILERENAME_START") {
    tmp.renamingId = action.payload;
  } else if (action.type === "FILERENAME_END") {
    tmp.renamingId = null;
  } else if (action.type === "FILERENAME") {
    if (action.payload && action.payload.id && action.payload.name) {
      tmp.data.renameItem(action.payload.id, action.payload.name);
      tmp.renamingId = null;
      mutated = true;
    }
  } else if (action.type === "FILEDELETE_START") {
    tmp.deleteConfirmId = action.payload;
  } else if (action.type === "FILEDELETE_CANCEL") {
    tmp.deleteConfirmId = null;
  } else if (action.type === "FILEDELETE") {
    if (action.payload) {
      tmp.data.removeItem(action.payload);
      tmp.deleteConfirmId = null;
      mutated = true;
    }
  } else if (action.type === "FILEPROPS") {
    tmp.props = action.payload;
  } else if (action.type === "FILEDIALOG_OPEN") {
    // action.payload: { mode, fileName, caller, startDir, content }
    var startDir = action.payload.startDir || "%user%";
    if (startDir.includes("%") && tmp.data.special[startDir] != null) {
      startDir = tmp.data.special[startDir];
    }
    tmp.fileDialog = {
      mode: action.payload.mode || "save",
      cdir: startDir,
      fileName: action.payload.fileName || "Sem Título",
      caller: action.payload.caller || null,
      content: action.payload.content || "",
      ext: action.payload.ext || "txt",
    };
  } else if (action.type === "FILEDIALOG_CLOSE") {
    // Se o payload contém dados (modo open), preserva para leitura do caller
    if (action.payload && action.payload.caller) {
      tmp.lastClosedDialog = {
        cdir: action.payload.cdir,
        fileName: action.payload.fileName,
        caller: action.payload.caller,
      };
    }
    tmp.fileDialog = null;
  } else if (action.type === "FILEDIALOG_NAVIGATE") {
    if (tmp.fileDialog) {
      tmp.fileDialog = { ...tmp.fileDialog, cdir: action.payload };
    }
  } else if (action.type === "FILEDIALOG_FILENAME") {
    if (tmp.fileDialog) {
      tmp.fileDialog = { ...tmp.fileDialog, fileName: action.payload };
    }
  } else if (action.type === "FILEDIALOG_SAVE") {
    // Salva o arquivo e fecha o diálogo
    // action.payload: { parentId, fileName, content }
    if (action.payload && action.payload.parentId && action.payload.fileName) {
      var parent = tmp.data.getId(action.payload.parentId);
      if (parent) {
        var ext = action.payload.ext || "txt";
        var nameWithExt = action.payload.fileName
          .toLowerCase()
          .endsWith("." + ext)
          ? action.payload.fileName
          : action.payload.fileName + "." + ext;
        var existing = parent.data
          ? parent.data.find(
              (x) => x.name.toLowerCase() === nameWithExt.toLowerCase()
            )
          : null;
        if (existing) {
          existing.data = action.payload.content || "";
        } else {
          var newFile = tmp.data.createFile(
            action.payload.parentId,
            nameWithExt,
            ext
          );
          if (newFile) newFile.data = action.payload.content || "";
        }
        mutated = true;
      }
    }
    tmp.fileDialog = null;
  } else if (action.type === "_FILEDIALOG_SET_CONTENT") {
    // Atualiza o conteúdo do arquivo no diálogo aberto (interno, sem persistir)
    if (tmp.fileDialog) {
      tmp.fileDialog = { ...tmp.fileDialog, content: action.payload };
    }
  }

  // Force re-render when data is mutated in place
  if (mutated) {
    tmp.revision = (tmp.revision || 0) + 1;
  }

  if (!navHist && tmp.cdir != tmp.hist[tmp.hid]) {
    tmp.hist.splice(tmp.hid + 1);
    tmp.hist.push(tmp.cdir);
    tmp.hid = tmp.hist.length - 1;
  }

  tmp.cdir = tmp.hist[tmp.hid];
  if (tmp.cdir.includes("%")) {
    if (tmp.data.special[tmp.cdir] != null) {
      tmp.cdir = tmp.data.special[tmp.cdir];
      tmp[tmp.hid] = tmp.cdir;
    }
  }

  tmp.cpath = tmp.data.getPath(tmp.cdir);
  return tmp;
};

export default fileReducer;
