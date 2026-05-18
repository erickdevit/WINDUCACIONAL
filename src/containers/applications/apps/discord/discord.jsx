import "./discord.scss";
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Icon, LazyComponent } from "../../../../utils/general";
import { AppWindow } from "../../../../components/shared/AppWindow";

import WidgetBot from "@widgetbot/react-embed";

export const DScord = () => {
  const wnapp = useSelector((state) => state.apps.discord);
  const [url, setUrl] = useState(null);
  const servers = [
    {
      src: "arrtective.png",
      link: "https://discord.io/arttective",
    },
    {
      src: "mimi.png",
      link: "https://discord.gg/AGSCfjgDMc",
    },
    {
      src: "narjiday.png",
      link: "https://discord.gg/K9wcgZJfXS",
    },
    {
      src: "aliyss.png",
      link: "https://discord.gg/zAypMTH",
    },
  ];

  useEffect(() => {
    if (url == null) {
      setUrl(
        "https://e.widgetbot.io/channels/868499076432408627/868499076432408631"
      );
      // setUrl("https://emerald.widgetbot.io/channels/299881420891881473/450428756855750666/?api=e2f9b64f-5292-43f5-a0d8-26fa43447eeb")
    }
  });

  return (
    <AppWindow
      wnapp={wnapp}
      app={wnapp.action}
      icon={wnapp.icon}
      name="Discord"
      className="discordWn"
      toolbarProps={{
        bg: "#282a2f",
        invert: true,
      }}
      windowScreenClassName="flex flex-col"
      restWindowClassName="flex-grow flex"
    >
      <div className="dsbar w-18">
        <div className="servCont noscroll">
          <Icon
            className="dsIcon"
            src="./img/asset/discord.png"
            ext
            width={26}
            click="EXTERNAL"
            payload="https://discord.gg/9jtcVZ3tWm"
          />
          <hr />
          <Icon
            className="wnServer svIcon"
            src="./img/asset/server.gif"
            width={48}
            click="EXTERNAL"
            payload="https://discord.gg/9jtcVZ3tWm"
            ext
          />
          {servers.map((server, i) => (
            <Icon
              key={i}
              className="svIcon"
              src={"./img/asset/" + server.src}
              click="EXTERNAL"
              payload={server.link}
              ext
              width={48}
            />
          ))}
        </div>
        <div className="joincont">
          <a
            href="https://discord.gg/9jtcVZ3tWm"
            target="_blank"
            rel="noreferrer"
          >
            Join
          </a>
        </div>
      </div>
      <div className="flex-grow overflow-hidden">
        <LazyComponent show={!wnapp.hide}>
          <WidgetBot className="w-full h-full" shard={url || ""} />
        </LazyComponent>
      </div>
    </AppWindow>
  );
};
