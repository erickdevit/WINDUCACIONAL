const walls = [
  "default/img0.jpg",
  "dark/img0.jpg",
  "ThemeA/img0.jpg",
  "ThemeA/img1.jpg",
  "ThemeA/img2.jpg",
  "ThemeA/img3.jpg",
  "ThemeB/img0.jpg",
  "ThemeB/img1.jpg",
  "ThemeB/img2.jpg",
  "ThemeB/img3.jpg",
  "ThemeC/img0.jpg",
  "ThemeC/img1.jpg",
  "ThemeC/img2.jpg",
  "ThemeC/img3.jpg",
  "ThemeD/img0.jpg",
  "ThemeD/img1.jpg",
  "ThemeD/img2.jpg",
  "ThemeD/img3.jpg",
];

const themes = ["default", "dark", "ThemeA", "ThemeB", "ThemeD", "ThemeC"];

const defState = {
  themes: themes,
  wps: 0,
  src: walls[0],
  locked: true,
  booted: false || import.meta.env.MODE == "development",
  act: "",
  dir: 0,
  userId: null,
};

const wallReducer = (state = defState, action) => {
  switch (action.type) {
    case "WALLUSER":
      return {
        ...state,
        userId: action.payload,
      };
    case "WALLUNLOCK":
      return {
        ...state,
        locked: false,
        dir: 0,
      };
    case "WALLNEXT":
      var twps = (state.wps + 1) % walls.length;
      return {
        ...state,
        wps: twps,
        src: walls[twps],
      };
    case "WALLALOCK":
      return {
        ...state,
        locked: true,
        dir: -1,
      };
    case "WALLBOOTED":
      return {
        ...state,
        booted: true,
        dir: 0,
        act: "",
      };
    case "WALLRESTART":
      return {
        ...state,
        booted: false,
        dir: -1,
        locked: true,
        act: "restart",
      };
    case "WALLSHUTDN":
      return {
        ...state,
        booted: false,
        dir: -1,
        locked: true,
        act: "shutdn",
      };
    case "WALLSET":
      var newWps = 0;
      var src = "";

      if (typeof action.payload === "number" || !Number.isNaN(parseInt(action.payload))) {
        newWps = parseInt(action.payload);
        src = walls[newWps] ? walls[newWps] : walls[0];
      } else {
        const idx = walls.findIndex((item) => item === action.payload);
        src = action.payload;
        newWps = idx >= 0 ? idx : 0;
      }

      return {
        ...state,
        wps: newWps,
        src: src,
      };
    default:
      return state;
  }
};

export default wallReducer;