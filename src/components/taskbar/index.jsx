import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { canDisplayAppForUser } from "../../lib/appVisibility";
import { Icon } from "../../utils/general";
import Battery from "../shared/Battery";
import {
  getMobilePortraitTaskApps,
  matchesMobilePortrait,
  MOBILE_PORTRAIT_QUERY,
} from "./taskbarUtils";
import "./taskbar.scss";

const Taskbar = () => {
  const { tasks, apps, user } = useSelector((state) => {
    const visibleTaskApps = state.taskbar.apps.filter((app) =>
      canDisplayAppForUser(app, state.setting?.person)
    );
    var tmpApps = { ...state.apps };
    for (var i = 0; i < visibleTaskApps.length; i++) {
      const icon = visibleTaskApps[i].icon;
      if (tmpApps[icon]) {
        tmpApps[icon] = { ...tmpApps[icon], task: true };
      }
    }
    return {
      tasks: {
        ...state.taskbar,
        apps: visibleTaskApps,
      },
      apps: tmpApps,
      user: state.setting?.person,
    };
  });
  const dispatch = useDispatch();

  const showPrev = (event) => {
    var ele = event.target;
    while (ele && ele.getAttribute("value") == null) {
      ele = ele.parentElement;
    }

    var appPrev = ele.getAttribute("value");
    var xpos = window.scrollX + ele.getBoundingClientRect().left;

    var offsetx = Math.round((xpos * 10000) / window.innerWidth) / 100;

    dispatch({
      type: "TASKPSHOW",
      payload: {
        app: appPrev,
        pos: offsetx,
      },
    });
  };

  const hidePrev = () => {
    dispatch({ type: "TASKPHIDE" });
  };

  const clickDispatch = (event) => {
    var action = {
      type: event.target.dataset.action,
      payload: event.target.dataset.payload,
    };

    if (action.type) {
      dispatch(action);
    }
  };

  const [time, setTime] = useState(new Date());
  const [isMobilePortrait, setIsMobilePortrait] = useState(
    matchesMobilePortrait
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const media = window.matchMedia(MOBILE_PORTRAIT_QUERY);
    const updateMobilePortrait = () => {
      setIsMobilePortrait(media.matches);
    };

    updateMobilePortrait();
    media.addEventListener?.("change", updateMobilePortrait);
    return () => media.removeEventListener?.("change", updateMobilePortrait);
  }, []);

  const taskbarApps = isMobilePortrait
    ? getMobilePortraitTaskApps({
        taskApps: tasks.apps,
        apps,
        user,
      })
    : tasks.apps;
  const taskbarAppIcons = new Set(taskbarApps.map((app) => app.icon));

  return (
    <div className="taskbar">
      <div className="taskcont">
        <div className="tasksCont" data-menu="task" data-side={tasks.align}>
          <div className="tsbar" onMouseOut={hidePrev}>
            <Icon className="tsIcon" src="home" width={24} click="STARTOGG" />
            {tasks.search ? (
              <Icon
                click="STARTSRC"
                className="tsIcon searchIcon"
                icon="taskSearch"
              />
            ) : null}
            {tasks.widgets ? (
              <Icon
                className="tsIcon widget"
                src="widget"
                width={24}
                click="WIDGTOGG"
              />
            ) : null}
            {taskbarApps.map((task, i) => {
              var isHidden = apps[task.icon]?.hide;
              var isActive = apps[task.icon]?.z == apps.hz;
              return (
                <div
                  key={i}
                  onMouseOver={(!isActive && !isHidden && showPrev) || null}
                  value={task.icon}
                >
                  <Icon
                    className="tsIcon"
                    width={24}
                    open={isHidden ? null : true}
                    click={task.action}
                    active={isActive}
                    payload={isHidden ? "full" : "togg"}
                    src={task.icon}
                  />
                </div>
              );
            })}
            {Object.keys(apps).map((key, i) => {
              if (key != "hz") {
                var isActive = apps[key].z == apps.hz;
              }
              return key != "hz" &&
                key != "undefined" &&
                canDisplayAppForUser(apps[key], user) &&
                !taskbarAppIcons.has(apps[key].icon) &&
                !apps[key].hide ? (
                <div
                  key={i}
                  onMouseOver={(!isActive && showPrev) || null}
                  value={apps[key].icon}
                >
                  <Icon
                    className="tsIcon"
                    width={24}
                    active={isActive}
                    click={apps[key].action}
                    payload="togg"
                    open="true"
                    src={apps[key].icon}
                  />
                </div>
              ) : null;
            })}
          </div>
        </div>
        <div className="taskright">
          <div
            className="px-2 prtclk handcr hvlight flex"
            onClick={clickDispatch}
            data-action="BANDTOGG"
          >
            <Icon fafa="faChevronUp" width={10} />
          </div>
          <div
            className="prtclk handcr my-1 px-1 hvlight flex rounded"
            onClick={clickDispatch}
            data-action="PANETOGG"
          >
            <Icon className="taskIcon" src="wifi" ui width={16} />
            <Icon
              className="taskIcon"
              src={"audio" + tasks.audio}
              ui
              width={16}
            />
            <Battery />
          </div>

          <div
            className="prtclk handcr my-1 px-1 hvlight flex rounded vkb-toggle"
            onClick={clickDispatch}
            data-action="VIRTUALKEYBOARD"
          >
            <Icon className="taskIcon" src="keyboard" ui width={16} />
          </div>

          <div
            className="taskDate m-1 handcr prtclk rounded hvlight"
            onClick={clickDispatch}
            data-action="CALNTOGG"
          >
            <div>
              {new Date().toLocaleTimeString("pt-BR", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
            <div>
              {new Date().toLocaleDateString("pt-BR", {
                year: "2-digit",
                month: "2-digit",
                day: "numeric",
              })}
            </div>
          </div>
          <Icon className="graybd my-4" ui width={6} click="SHOWDSK" pr />
        </div>
      </div>
    </div>
  );
};

export default Taskbar;
