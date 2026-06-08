import React from "react";
import { Icon } from "../../../../../utils/general";

const formatTime = (ms) => {
  if (ms == null) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const getActionIcon = (action) => {
  switch (action.type) {
    case "app_open":
      return "faWindowMaximize";
    case "app_close":
      return "faXmark";
    case "file_op":
      return "faFile";
    default:
      return "faCircle";
  }
};

const getActionColor = (action) => {
  switch (action.type) {
    case "app_open":
      return "#1769aa";
    case "app_close":
      return "#637083";
    case "file_op":
      return "#16794c";
    default:
      return "#637083";
  }
};

const getActionVerb = (action) => {
  switch (action.type) {
    case "app_open":
      return "Abriu";
    case "app_close":
      return "Fechou";
    case "file_op":
      return "";
    default:
      return "";
  }
};

export const ActivityTimeline = ({ actions = [] }) => {
  if (actions.length === 0) {
    return (
      <div className="exam-empty compact">
        Nenhuma ação registrada na parte prática.
      </div>
    );
  }

  const totalDuration =
    actions.length > 0 ? Math.max(...actions.map((a) => a.timestamp || 0)) : 0;

  return (
    <div className="activity-timeline">
      <div className="timeline-header">
        <span className="timeline-badge">{actions.length} ações</span>
        <span className="timeline-badge">
          {formatTime(totalDuration)} duração
        </span>
      </div>
      <div className="timeline-list">
        {actions.map((action, i) => (
          <div key={i} className="timeline-item">
            <div
              className="timeline-dot"
              style={{ background: getActionColor(action) }}
            >
              <Icon fafa={getActionIcon(action)} width={10} />
            </div>
            <div className="timeline-connector" />
            <div className="timeline-content">
              <div className="timeline-text">
                <strong>
                  {getActionVerb(action)} {action.label}
                </strong>
                {action.detail && (
                  <span className="timeline-detail">{action.detail}</span>
                )}
              </div>
              <span className="timeline-time">
                {formatTime(action.timestamp)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
