import "./chat.scss";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AppWindow } from "../../../../components/shared/AppWindow";

// ─── Constantes ──────────────────────────────────────────────────────────────
const EMOJI_LIST = [
  "😀",
  "😂",
  "😍",
  "🤔",
  "😎",
  "😢",
  "😡",
  "👍",
  "👎",
  "❤️",
  "🔥",
  "✅",
  "🎉",
  "🙌",
  "👏",
  "💡",
  "📝",
  "📌",
  "🚀",
  "⭐",
  "💬",
  "🤝",
  "🙏",
  "😅",
  "😊",
  "🥳",
  "😴",
  "🤣",
  "😮",
  "👀",
  "🫡",
  "💪",
  "🧠",
  "📚",
  "🖥️",
  "⌨️",
];

// ─── Utilitários ──────────────────────────────────────────────────────────────
const formatTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const pad = (n) => String(n).padStart(2, "0");
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (sameDay) return time;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${time}`;
};

const avatarColors = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ef4444",
  "#14b8a6",
];
const getAvatarColor = (name = "") => {
  let h = 0;
  for (let i = 0; i < name.length; i++)
    h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return avatarColors[Math.abs(h) % avatarColors.length];
};
const getInitials = (name = "") =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

// ─── Sub-componentes ──────────────────────────────────────────────────────────
const Avatar = ({ name, size = 32 }) => (
  <div
    className="chat-avatar"
    style={{
      width: size,
      height: size,
      fontSize: size * 0.38,
      background: getAvatarColor(name),
    }}
  >
    {getInitials(name)}
  </div>
);

const AttachmentBubble = ({ attachment }) => {
  const parsed =
    typeof attachment === "string" ? JSON.parse(attachment) : attachment;
  return (
    <div className="chat-attachment">
      <span className="chat-attachment-icon">📄</span>
      <div className="chat-attachment-info">
        <span className="chat-attachment-name">{parsed.name}</span>
        <span className="chat-attachment-hint">Arquivo de texto</span>
      </div>
    </div>
  );
};

const MessageBubble = ({ msg, isMine }) => (
  <div className={`chat-msg-row ${isMine ? "mine" : "theirs"}`}>
    {!isMine && <Avatar name={msg.sender_username} size={28} />}
    <div className="chat-msg-content">
      {!isMine && (
        <span className="chat-msg-sender">{msg.sender_username}</span>
      )}
      <div
        className={`chat-bubble ${isMine ? "bubble-mine" : "bubble-theirs"}`}
      >
        {msg.body && <span className="chat-bubble-text">{msg.body}</span>}
        {msg.attachment && <AttachmentBubble attachment={msg.attachment} />}
      </div>
      <span className="chat-msg-time">{formatTime(msg.created_at)}</span>
    </div>
  </div>
);

// ─── Painel de conversa ────────────────────────────────────────────────────────
const ConversationPanel = ({
  threadId,
  title,
  myUserId,
  onRequestFilePicker,
  pendingAttachment,
  onClearAttachment,
}) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesRef = useRef(null);
  const eventSourceRef = useRef(null);
  const inputRef = useRef(null);

  // Carrega histórico e conecta SSE
  useEffect(() => {
    if (!threadId) return;

    let active = true;

    const loadHistory = async () => {
      try {
        const resp = await fetch(`/api/chat/threads/${threadId}/messages`);
        if (!resp.ok) return;
        const data = await resp.json();
        if (active) setMessages(data.messages || []);
      } catch (_) {}
    };

    loadHistory();

    // Fecha SSE anterior
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`/api/chat/threads/${threadId}/events`);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      if (!active) return;
      try {
        const msg = JSON.parse(e.data);
        setMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      } catch (_) {}
    };

    return () => {
      active = false;
      es.close();
    };
  }, [threadId]);

  // Mantém a rolagem restrita à lista de mensagens.
  useEffect(() => {
    const messagePane = messagesRef.current;
    if (!messagePane) return;
    messagePane.scrollTop = messagePane.scrollHeight;
  }, [messages]);

  const send = useCallback(async () => {
    const body = text.trim();
    if (!body && !pendingAttachment) return;
    if (sending) return;

    setSending(true);
    try {
      await fetch(`/api/chat/threads/${threadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          attachment: pendingAttachment,
        }),
      });
      setText("");
      if (onClearAttachment) onClearAttachment();
    } catch (_) {}
    setSending(false);
    inputRef.current?.focus({ preventScroll: true });
  }, [text, pendingAttachment, sending, threadId, onClearAttachment]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (!threadId) {
    return (
      <div className="chat-empty-state">
        <div className="chat-empty-icon">💬</div>
        <p>Selecione uma conversa</p>
      </div>
    );
  }

  return (
    <div className="chat-conversation">
      <div className="chat-conv-header">
        <span className="chat-conv-title">{title}</span>
      </div>

      <div className="chat-messages win11Scroll" ref={messagesRef}>
        {messages.length === 0 && (
          <div className="chat-no-messages">
            Nenhuma mensagem ainda. Seja o primeiro a falar!
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isMine={msg.sender_id === myUserId}
          />
        ))}
      </div>

      {/* Anexo pendente */}
      {pendingAttachment && (
        <div className="chat-pending-attachment">
          <span>📄 {pendingAttachment.name}</span>
          <button onClick={onClearAttachment}>✕</button>
        </div>
      )}

      {/* Picker de emojis */}
      {showEmoji && (
        <div className="chat-emoji-picker">
          {EMOJI_LIST.map((em, i) => (
            <button
              key={i}
              className="chat-emoji-btn"
              onClick={() => {
                setText((t) => t + em);
                setShowEmoji(false);
                inputRef.current?.focus({ preventScroll: true });
              }}
            >
              {em}
            </button>
          ))}
        </div>
      )}

      {/* Barra de entrada */}
      <div className="chat-input-bar">
        <button
          className="chat-input-action"
          title="Enviar arquivo"
          onClick={onRequestFilePicker}
        >
          📎
        </button>
        <button
          className="chat-input-action"
          title="Emojis"
          onClick={() => setShowEmoji((v) => !v)}
        >
          😊
        </button>
        <textarea
          ref={inputRef}
          className="chat-input-text win11Scroll"
          placeholder="Digite uma mensagem..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          className={`chat-send-btn ${sending ? "sending" : ""}`}
          onClick={send}
          disabled={sending}
          title="Enviar"
        >
          ➤
        </button>
      </div>
    </div>
  );
};

// ─── Componente Principal ──────────────────────────────────────────────────────
export const ChatApp = () => {
  const wnapp = useSelector((state) => state.apps.chat);
  const person = useSelector((state) => state.setting.person);
  const files = useSelector((state) => state.files);
  const dispatch = useDispatch();

  const isProfessor = person.role === "professor";

  // Turmas disponíveis
  const [turmas, setTurmas] = useState([]);
  const [selectedTurma, setSelectedTurma] = useState(null);

  // Membros da turma selecionada
  const [members, setMembers] = useState([]);

  // Estado da navegação: "group" | "dm"
  const [activeTab, setActiveTab] = useState("group");

  // Thread atual
  const [groupThreadId, setGroupThreadId] = useState(null);
  const [dmThreadId, setDmThreadId] = useState(null);
  const [dmPeer, setDmPeer] = useState(null);

  // Anexo pendente (arquivo selecionado via FileDialog)
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const lastRoutePayloadRef = useRef(null);

  // Carrega turmas na abertura
  useEffect(() => {
    if (wnapp.hide) return;
    fetch("/api/chat/turmas")
      .then((r) => r.json())
      .then((d) => {
        setTurmas(d.turmas || []);
        if (!selectedTurma && d.turmas?.length > 0) {
          setSelectedTurma(d.turmas[0].id);
        }
      })
      .catch(() => {});
  }, [wnapp.hide]);

  // Quando muda a turma selecionada: busca thread de grupo + membros
  useEffect(() => {
    if (!selectedTurma) return;
    setGroupThreadId(null);
    setMembers([]);

    fetch(`/api/chat/turmas/${selectedTurma}/group-thread`)
      .then((r) => r.json())
      .then((d) => setGroupThreadId(d.threadId))
      .catch(() => {});

    fetch(`/api/chat/turmas/${selectedTurma}/members`)
      .then((r) => r.json())
      .then((d) => setMembers(d.members || []))
      .catch(() => {});
  }, [selectedTurma]);

  useEffect(() => {
    const payload = wnapp.payload;
    if (!payload || payload.kind !== "chat-thread" || !payload.threadId) {
      return;
    }

    const payloadKey = `${payload.threadId}:${payload.threadType || ""}`;
    if (lastRoutePayloadRef.current === payloadKey) return;
    lastRoutePayloadRef.current = payloadKey;

    if (payload.threadType === "dm") {
      setDmPeer(payload.peer || null);
      setDmThreadId(payload.threadId);
      setActiveTab("dm");
      return;
    }

    if (payload.turmaId) {
      setSelectedTurma(payload.turmaId);
    }
    setGroupThreadId(payload.threadId);
    setActiveTab("group");
  }, [wnapp.payload]);

  // Detecta quando o FileDialog fecha após seleção (caller === 'chat')
  const lastHandledRef = useRef(null);
  useEffect(() => {
    const lcd = files.lastClosedDialog;
    if (!lcd || lcd.caller !== "chat") return;

    // Evita processar o mesmo fechamento duas vezes
    const key = `${lcd.cdir}:${lcd.fileName}`;
    if (lastHandledRef.current === key) return;
    lastHandledRef.current = key;

    // Localiza o arquivo selecionado no sistema de arquivos
    const parentFolder = files.data.getId(lcd.cdir);
    if (parentFolder && parentFolder.data) {
      const nameToFind = (lcd.fileName || "").endsWith(".txt")
        ? lcd.fileName
        : lcd.fileName + ".txt";
      const found = parentFolder.data.find(
        (x) => x.name.toLowerCase() === nameToFind.toLowerCase()
      );
      if (found) {
        setPendingAttachment({
          name: found.name,
          content: found.data || "",
          type: "txt",
        });
      }
    }
  }, [files.lastClosedDialog, files.data]);

  const openDm = async (member) => {
    try {
      const resp = await fetch("/api/chat/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peerId: member.id }),
      });
      const data = await resp.json();
      if (data.threadId) {
        setDmPeer(member);
        setDmThreadId(data.threadId);
        setActiveTab("dm");
      }
    } catch (_) {}
  };

  // Abre o FileDialog padrão do Explorer para selecionar arquivo .txt
  const handleRequestFilePicker = () => {
    dispatch({
      type: "FILEDIALOG_OPEN",
      payload: {
        mode: "open",
        fileName: "",
        caller: "chat",
        startDir: "%user%",
        content: "",
      },
    });
  };

  const currentThreadId = activeTab === "group" ? groupThreadId : dmThreadId;
  const currentTitle =
    activeTab === "group"
      ? `Grupo: ${turmas.find((t) => t.id === selectedTurma)?.nome || ""}`
      : dmPeer
      ? dmPeer.username
      : "";

  return (
    <AppWindow
      wnapp={wnapp}
      app={wnapp.action}
      icon={wnapp.icon}
      name="Chat da Turma"
      className={`chatWn darkWindow flex flex-col font-sans ${
        wnapp.size === "cstm" ? "windowMode" : ""
      }`}
      toolbarProps={{
        bg: "#1e1e2e",
        invert: true,
      }}
      windowScreenClassName="flex flex-col"
      restWindowClassName="flex-grow flex overflow-hidden"
    >
      <div className="chat-layout">
        {/* ── Sidebar ── */}
        <aside className="chat-sidebar">
          {/* Seletor de turma (professor vê todas) */}
          {isProfessor && turmas.length > 1 && (
            <div className="chat-turma-selector">
              <label className="chat-turma-label">Turma</label>
              <select
                className="chat-turma-select"
                value={selectedTurma || ""}
                onChange={(e) => setSelectedTurma(e.target.value)}
              >
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Abas */}
          <div className="chat-tabs">
            <button
              className={`chat-tab ${activeTab === "group" ? "active" : ""}`}
              onClick={() => setActiveTab("group")}
            >
              👥 Grupo
            </button>
            <button
              className={`chat-tab ${activeTab === "dm" ? "active" : ""}`}
              onClick={() => setActiveTab("dm")}
            >
              💬 Colegas
            </button>
          </div>

          {/* Conteúdo da sidebar */}
          {activeTab === "group" ? (
            <div className="chat-sidebar-section">
              <div className="chat-section-title">Membros da turma</div>
              <div className="chat-members-list">
                {members.length === 0 && (
                  <div className="chat-members-empty">
                    Nenhum colega encontrado.
                  </div>
                )}
                {members.map((m) => (
                  <div key={m.id} className="chat-member-item">
                    <Avatar name={m.username} size={28} />
                    <span className="chat-member-name">{m.username}</span>
                    {m.role === "professor" && (
                      <span className="chat-member-badge">Prof.</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="chat-sidebar-section">
              <div className="chat-section-title">Iniciar conversa</div>
              <div className="chat-members-list">
                {members.length === 0 && (
                  <div className="chat-members-empty">
                    Nenhum colega na turma.
                  </div>
                )}
                {members.map((m) => (
                  <div
                    key={m.id}
                    className={`chat-member-item clickable ${
                      dmPeer?.id === m.id ? "active" : ""
                    }`}
                    onClick={() => openDm(m)}
                  >
                    <Avatar name={m.username} size={28} />
                    <span className="chat-member-name">{m.username}</span>
                    {m.role === "professor" && (
                      <span className="chat-member-badge">Prof.</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ── Área de conversa ── */}
        <main className="chat-main">
          {activeTab === "dm" && !dmPeer ? (
            <div className="chat-empty-state">
              <div className="chat-empty-icon">💬</div>
              <p>Selecione um colega para conversar</p>
            </div>
          ) : (
            <ConversationPanel
              key={currentThreadId}
              threadId={currentThreadId}
              title={currentTitle}
              myUserId={person.id}
              onRequestFilePicker={handleRequestFilePicker}
              pendingAttachment={pendingAttachment}
              onClearAttachment={() => setPendingAttachment(null)}
            />
          )}
        </main>
      </div>
    </AppWindow>
  );
};
