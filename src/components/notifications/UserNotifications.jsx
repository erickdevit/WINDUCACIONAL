import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { api } from "../../lib/api";
import { Icon } from "../../utils/general";
import "./user-notifications.scss";

const NOTIFICATION_TIMEOUT_MS = 9000;

const getNotificationIcon = (notification) => {
  if (notification.icon === "typing") return "typing";
  if (notification.icon === "chat") return "chat";
  return "info";
};

const trimNotificationBody = (body = "") => {
  const normalized = String(body).replace(/\s+/g, " ").trim();
  if (normalized.length <= 110) return normalized;
  return `${normalized.slice(0, 107)}...`;
};

export const UserNotifications = ({ user }) => {
  const dispatch = useDispatch();
  const apps = useSelector((state) => state.apps);
  const [notifications, setNotifications] = useState([]);
  const timersRef = useRef(new Map());

  const dismissNotification = (id) => {
    const timer = timersRef.current.get(id);
    if (timer) clearTimeout(timer);
    timersRef.current.delete(id);
    setNotifications((current) => current.filter((item) => item.id !== id));
  };

  const pushNotification = (notification) => {
    if (notification.type === "force_logout") {
      alert(notification.body || "Sua sessão foi encerrada.");
      window.location.reload();
      return;
    }

    let shouldSuppress = false;

    if (notification.source === "typing-pvp") {
      const typingApp = apps.typing;
      const typingKidsApp = apps.typingKids;
      if (
        (typingApp && !typingApp.hide && typingApp.z === apps.hz) ||
        (typingKidsApp && !typingKidsApp.hide && typingKidsApp.z === apps.hz)
      ) {
        shouldSuppress = true;
      }
    } else if (notification.source === "chat") {
      const chatApp = apps.chat;
      if (chatApp && !chatApp.hide && chatApp.z === apps.hz) {
        shouldSuppress = true;
      }
    }

    if (shouldSuppress) return;

    const id = notification.id || `${Date.now()}-${Math.random()}`;
    const nextNotification = {
      ...notification,
      id,
    };

    setNotifications((current) => {
      const withoutDuplicate = current.filter((item) => item.id !== id);
      return [nextNotification, ...withoutDuplicate].slice(0, 4);
    });

    if (timersRef.current.has(id)) {
      clearTimeout(timersRef.current.get(id));
    }
    timersRef.current.set(
      id,
      setTimeout(() => dismissNotification(id), NOTIFICATION_TIMEOUT_MS)
    );
  };

  useEffect(() => {
    if (!user) return undefined;

    const subscription = api.subscribeNotifications({
      onNotification: pushNotification,
      onError: () => {},
    });

    return () => {
      subscription?.close?.();
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
      setNotifications([]);
    };
  }, [user?.id]);

  const openNotification = (notification) => {
    const action = notification.action || {};

    if (action.type === "open-chat") {
      dispatch({
        type: "CHATAPP",
        payload: {
          kind: "chat-thread",
          threadId: action.threadId,
          threadType: action.threadType,
          turmaId: action.turmaId,
          peer: action.peer,
        },
      });
    }

    if (action.type === "open-typing-pvp") {
      dispatch({
        type: "TYPINGAPP",
        payload: {
          kind: "typing-pvp",
          view: "games-pvp",
          challenge: action.challenge?.challenger || action.challenge,
        },
      });
    }

    dismissNotification(notification.id);
  };

  if (notifications.length === 0) return null;

  return (
    <div className="userNotificationStack" aria-live="polite">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="userNotificationToast"
          onClick={() => openNotification(notification)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openNotification(notification);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="userNotificationIcon">
            <Icon src={getNotificationIcon(notification)} width={22} />
          </div>
          <div className="userNotificationContent">
            <span className="userNotificationApp">
              {notification.source === "typing-pvp"
                ? "Digitação"
                : "Chat da Turma"}
            </span>
            <strong>{notification.title}</strong>
            <span>{trimNotificationBody(notification.body)}</span>
          </div>
          <button
            type="button"
            className="userNotificationClose"
            onClick={(event) => {
              event.stopPropagation();
              dismissNotification(notification.id);
            }}
            aria-label="Dispensar notificação"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};
