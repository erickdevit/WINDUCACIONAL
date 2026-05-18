import React from "react";
import { useSelector } from "react-redux";
import { AppWindow } from "../../components/shared/AppWindow";

export const IFrame = (props) => {
  const wnapp = useSelector((state) => state.apps[props.icon]);
  if (!wnapp) return null;
  var data = wnapp.data;

  return wnapp.hide ? null : (
    <AppWindow
      wnapp={wnapp}
      app={wnapp.action}
      icon={wnapp.icon}
      name={wnapp.name}
      className={data.invert != true ? "lightWindow" : "darkWindow"}
      toolbarProps={{
        invert: data.invert == true ? true : null,
        noinvert: true,
      }}
    >
      <div className="flex-grow overflow-hidden">
        <iframe
          src={data.url}
          allow="camera;microphone"
          className="w-full h-full"
          frameBorder="0"
          title={wnapp.name}
        ></iframe>
      </div>
    </AppWindow>
  );
};
