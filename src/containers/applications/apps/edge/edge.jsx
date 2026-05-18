import "./edge.scss";
import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Icon, LazyComponent } from "../../../../utils/general";
import { AppWindow } from "../../../../components/shared/AppWindow";

const googleProfileStorageKey = (person) =>
  `edgeGoogleProfile_${person?.id || person?.username || "guest"}`;

const isGoogleAddress = (address) => {
  try {
    const hostname = new URL(address).hostname.replace(/^www\./, "");
    return (
      hostname === "google.com" ||
      hostname.endsWith(".google.com") ||
      hostname === "google.com.br" ||
      hostname.endsWith(".google.com.br") ||
      hostname === "youtube.com" ||
      hostname.endsWith(".youtube.com")
    );
  } catch (err) {
    return false;
  }
};

export const EdgeMenu = () => {
  const wnapp = useSelector((state) => state.apps.edge);
  const person = useSelector((state) => state.setting.person);
  const defaultTab = {
    url: "https://www.google.com/webhp?igu=1",
    hist: [
      "https://www.google.com/webhp?igu=1",
      "https://www.google.com/webhp?igu=1",
    ],
    isTyping: false,
  };
  const [tabs, setTabs] = useState([defaultTab]);
  const [activeTab, setActiveTab] = useState(0);
  const [googleProfile, setGoogleProfile] = useState(null);
  const [googleForm, setGoogleForm] = useState({
    name: person?.name || person?.displayName || person?.username || "",
    email: person?.username ? `${person.username}@simulador.local` : "",
  });
  const dispatch = useDispatch();

  const currentTab = tabs[activeTab];
  const { url, hist, isTyping } = currentTab;
  const currentUrl = !isTyping ? url : hist[0];
  const isGooglePage = isGoogleAddress(currentUrl);

  const updateTab = (updates) => {
    setTabs((prevTabs) =>
      prevTabs.map((t, i) => (i === activeTab ? { ...t, ...updates } : t))
    );
  };

  const addTab = () => {
    setTabs([...tabs, defaultTab]);
    setActiveTab(tabs.length);
  };

  const closeTab = (index, e) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      dispatch({ type: wnapp.action, payload: "close" });
    } else {
      const newTabs = tabs.filter((_, i) => i !== index);
      setTabs(newTabs);
      if (activeTab >= index && activeTab > 0) {
        setActiveTab(activeTab - 1);
      } else if (activeTab === index) {
        setActiveTab(Math.max(0, index - 1));
      }
    }
  };

  const iframes = {
    "https://www.google.com/webhp?igu=1": "Google",
    "https://bing.com": "Bing",
    "https://www.youtube.com/embed/m0EHSoZzHEA": "Youtube",
  };

  const isValidURL = (string) => {
    var res = string.match(
      /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g
    );
    return res !== null;
  };

  const action = (e) => {
    var iframe = document.getElementById("isite-" + activeTab);
    var x = e.target && e.target.dataset.payload;

    if (iframe && x == 0) {
      iframe.src = iframe.src;
    } else if (iframe && x == 1) {
      updateTab({
        hist: [url, "https://www.bing.com"],
        url: "https://www.bing.com",
        isTyping: false,
      });
    } else if (iframe && x == 2) {
      updateTab({
        hist: [url, "https://www.google.com/webhp?igu=1"],
        url: "https://www.google.com/webhp?igu=1",
        isTyping: false,
      });
    } else if (iframe && x == 3) {
      if (e.key === "Enter") {
        var qry = e.target.value;

        if (isValidURL(qry)) {
          if (!qry.startsWith("http")) {
            qry = "https://" + qry;
          }
        } else {
          qry = "https://www.google.com/search?q=" + qry;
        }

        e.target.value = qry;
        updateTab({ hist: [hist[0], qry], url: qry, isTyping: false });
      }
    } else if (x == 4) {
      updateTab({ url: hist[0], isTyping: false });
    } else if (x == 5) {
      updateTab({ url: hist[1], isTyping: false });
    } else if (x == 6) {
      var tmp = e.target.dataset.url;
      updateTab({ hist: [url, tmp], url: tmp, isTyping: false });
    }
  };

  const typing = (e) => {
    const val = e.target.value;
    setTabs((prevTabs) =>
      prevTabs.map((t, i) => {
        if (i === activeTab) {
          const updates = { url: val };
          if (!t.isTyping) {
            updates.isTyping = true;
            updates.hist = [t.url, t.url];
          }
          return { ...t, ...updates };
        }
        return t;
      })
    );
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(googleProfileStorageKey(person));
      const parsed = saved ? JSON.parse(saved) : null;
      setGoogleProfile(parsed);
      setGoogleForm({
        name:
          parsed?.name ||
          person?.name ||
          person?.displayName ||
          person?.username ||
          "",
        email:
          parsed?.email ||
          (person?.username ? `${person.username}@simulador.local` : ""),
      });
    } catch (err) {
      setGoogleProfile(null);
    }
  }, [person?.id, person?.username, person?.name, person?.displayName]);

  useEffect(() => {
    if (wnapp.url) {
      updateTab({ isTyping: false, url: wnapp.url });
      dispatch({ type: "EDGELINK" });
    }
  }, [wnapp.url]);

  const getDomain = (link) => {
    try {
      let u = new URL(link);
      return u.hostname.replace("www.", "");
    } catch (err) {
      return "Nova guia";
    }
  };

  const changeGoogleForm = (event) => {
    const { name, value } = event.target;
    setGoogleForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveGoogleProfile = (event) => {
    event.preventDefault();
    const nextProfile = {
      name: googleForm.name.trim(),
      email: googleForm.email.trim(),
      savedAt: new Date().toISOString(),
    };

    if (!nextProfile.name || !nextProfile.email) return;

    localStorage.setItem(
      googleProfileStorageKey(person),
      JSON.stringify(nextProfile)
    );
    setGoogleProfile(nextProfile);
  };

  const disconnectGoogleProfile = () => {
    localStorage.removeItem(googleProfileStorageKey(person));
    setGoogleProfile(null);
  };

  return (
    <AppWindow
      wnapp={wnapp}
      app={wnapp.action}
      icon={wnapp.icon}
      name="Browser"
      className="edgeBrowser"
      toolbarProps={{
        float: true,
      }}
      windowScreenClassName="flex flex-col"
      restWindowClassName="flex-grow flex flex-col"
      screenTop={
        <div className="overTool flex items-center">
          <Icon src={wnapp.icon} width={14} margin="0 6px" />
          <div className="flex">
            {tabs.map((tab, i) => (
              <div
                key={i}
                className="btab"
                style={{
                  background: i === activeTab ? "var(--bg0)" : "transparent",
                  opacity: i === activeTab ? 1 : 0.7,
                }}
                onClick={() => setActiveTab(i)}
              >
                <div className="text-xs truncate w-24">
                  {tab.url.includes("igu=1") ? "Nova guia" : getDomain(tab.url)}
                </div>
                <Icon
                  fafa="faTimes"
                  onClick={(e) => closeTab(i, e)}
                  width={10}
                />
              </div>
            ))}
          </div>
          <Icon
            fafa="faPlus"
            onClick={addTab}
            width={14}
            margin="0 6px"
            className="handcr hover:bg-gray-200 rounded p-1"
          />
        </div>
      }
    >
      <div className="addressBar w-full h-10 flex items-center">
        <Icon
          className="edgenavicon"
          src="left"
          onClick={action}
          payload={4}
          width={14}
          ui
          margin="0 8px"
        />
        <Icon
          className="edgenavicon"
          src="right"
          onClick={action}
          payload={5}
          width={14}
          ui
          margin="0 8px"
        />
        <Icon
          fafa="faRedo"
          onClick={action}
          payload={0}
          width={14}
          margin="0 8px"
        />
        <Icon
          fafa="faHome"
          onClick={action}
          payload={1}
          width={18}
          margin="0 16px"
        />
        <div className="addCont relative flex items-center">
          <input
            className="w-full h-6 px-4"
            onKeyDown={action}
            onChange={typing}
            data-payload={3}
            value={url}
            placeholder="Type url or a query to search"
            type="text"
          />
          <Icon
            className="z-1 handcr"
            src="google"
            ui
            onClick={action}
            payload={2}
            width={14}
            margin="0 10px"
          />
        </div>
      </div>
      <div className="w-full bookbar py-2">
        <div className="flex">
          {Object.keys(iframes).map((mark, i) => {
            return (
              <div
                key={i}
                className="flex handcr items-center ml-2 mr-1 prtclk"
                onClick={action}
                data-payload={6}
                data-url={mark}
              >
                <Icon
                  className="mr-1"
                  ext
                  width={16}
                  src={
                    iframes[mark][0] != "\n"
                      ? new URL(mark).origin + "/favicon.ico"
                      : favicons[mark]
                  }
                />
                <div className="text-xs">{iframes[mark].trim()}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="siteFrame flex-grow overflow-hidden relative">
        <LazyComponent show={!wnapp.hide}>
          {tabs.map((tab, i) => (
            <iframe
              key={i}
              src={!tab.isTyping ? tab.url : tab.hist[0]}
              id={`isite-${i}`}
              frameBorder="0"
              className="w-full h-full absolute top-0 left-0"
              style={{ display: i === activeTab ? "block" : "none" }}
              title="site"
            ></iframe>
          ))}
        </LazyComponent>

        {isGooglePage ? (
          <div className="edgeGoogleAccount">
            {googleProfile ? (
              <>
                <div className="edgeGoogleAvatar">
                  {googleProfile.name.charAt(0).toUpperCase()}
                </div>
                <div className="edgeGoogleInfo">
                  <strong>{googleProfile.name}</strong>
                  <span>{googleProfile.email}</span>
                </div>
                <button type="button" onClick={disconnectGoogleProfile}>
                  Sair
                </button>
              </>
            ) : (
              <form onSubmit={saveGoogleProfile}>
                <strong>Entrar no Google</strong>
                <input
                  name="email"
                  value={googleForm.email}
                  onChange={changeGoogleForm}
                  placeholder="email@gmail.com"
                  type="email"
                  required
                />
                <input
                  name="name"
                  value={googleForm.name}
                  onChange={changeGoogleForm}
                  placeholder="Nome da conta"
                  required
                />
                <button type="submit">Salvar login</button>
              </form>
            )}
          </div>
        ) : null}
      </div>
    </AppWindow>
  );
};
