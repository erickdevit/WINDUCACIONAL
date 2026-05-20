import { desktopApps } from "../utils";

const defState = {
  system: {
    power: {
      saver: {
        state: false,
      },
      battery: 100,
    },
    display: {
      brightness: 100,
      nightlight: {
        state: false,
      },
      connect: false,
    },
  },
  person: {
    name: "Usuário",
    username: "",
    role: "aluno",
    studentType: "normal",
    turmaId: null,
    theme: "light",
    color: "blue",
  },
  devices: {
    bluetooth: false,
  },
  network: {
    wifi: {
      state: true,
    },
    airplane: false,
  },
  privacy: {
    location: {
      state: false,
    },
  },
};

document.body.dataset.theme = defState.person.theme;

const changeVal = (obj, path, val = "togg") => {
  var tmp = obj;
  path = path.split(".");
  for (var i = 0; i < path.length - 1; i++) {
    tmp = tmp[path[i]];
  }

  if (val == "togg") {
    tmp[path[path.length - 1]] = !tmp[path[path.length - 1]];
  } else {
    tmp[path[path.length - 1]] = val;
  }

  return obj;
};

const settReducer = (state = defState, action) => {
  var tmpState = { ...state },
    changed = false;
  switch (action.type) {
    case "STNGTHEME":
      changed = true;
      tmpState.person.theme = action.payload;
      break;
    case "STNGTOGG":
      changed = true;
      tmpState = changeVal(tmpState, action.payload);
      break;
    case "STNGSETV":
      changed = true;
      tmpState = changeVal(tmpState, action.payload.path, action.payload.value);
      break;
    case "SETTLOAD":
      changed = true;
      tmpState = {
        ...action.payload,
        person: {
          ...tmpState.person,
          theme: action.payload?.person?.theme || tmpState.person.theme,
          color: action.payload?.person?.color || tmpState.person.color,
        },
      };
      break;
    case "SESSIONUSER":
      changed = true;
      tmpState.person = {
        ...tmpState.person,
        id: action.payload.id || null,
        name: action.payload.displayName,
        username: action.payload.username,
        role: action.payload.role,
        studentType: action.payload.studentType || "normal",
        turmaId: action.payload.turmaId || null,
      };
      break;
    case "LOGOUT":
      changed = true;
      tmpState.person = {
        name: "Usuário",
        username: "",
        role: "aluno",
        studentType: "normal",
        turmaId: null,
        theme: "light",
        color: "blue",
      };
      break;
    case "TOGGAIRPLNMD":
      changed = true;
      const airPlaneModeStatus = tmpState.network.airplane;
      if (tmpState.network.wifi.state === true && !airPlaneModeStatus) {
        tmpState = changeVal(tmpState, "network.wifi.state");
      }
      if (tmpState.devices.bluetooth === true && !airPlaneModeStatus) {
        tmpState = changeVal(tmpState, "devices.bluetooth");
      }
      tmpState = changeVal(tmpState, "network.airplane");
  }

  if (changed) {
    document.body.dataset.theme = tmpState.person.theme;
  }
  return tmpState;
};

export default settReducer;
