import "./camera.scss";
import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Icon } from "../../../../utils/general";
import { useTranslation } from "react-i18next";
import { AppWindow } from "../../../../components/shared/AppWindow";

export const Camera = () => {
  const wnapp = useSelector((state) => state.apps.camera);
  const hide = useSelector((state) => state.apps.camera.hide);
  const [stream, setStream] = useState(null);
  const { t } = useTranslation();

  const capture = () => {
    var video = document.querySelector("video");
    var canvas = document.querySelector("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    var df = video.videoWidth - video.videoHeight;

    canvas
      .getContext("2d")
      .drawImage(video, -df / 2, 0, video.videoWidth + df, video.videoHeight);
  };

  useEffect(() => {
    if (!wnapp.hide) {
      var video = document.getElementById("camvideo");

      video.setAttribute("playsinline", "");
      video.setAttribute("autoplay", "");
      video.setAttribute("muted", "");

      var constraints = {
        audio: false,
        video: true,
      };

      navigator.mediaDevices.getUserMedia(constraints).then((dstream) => {
        setStream(dstream);
        video.srcObject = dstream;
      });
    } else {
      if (stream != null) stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [hide]);

  return (
    <AppWindow
      wnapp={wnapp}
      app={wnapp.action}
      icon={wnapp.icon}
      name="Camera"
      className="wnCam"
      toolbarProps={{
        invert: true,
        bg: "#060606",
      }}
      windowScreenClassName="flex flex-col"
      restWindowClassName="flex-grow flex flex-col"
    >
      <div className="camcont">
        <div className="camctrl">
          <div
            className="cmicon"
            title={t("camera.take-photo")}
            onClick={capture}
          >
            <Icon icon="camera" />
          </div>
          <canvas id="camcanvas"></canvas>
        </div>
        <div className="vidcont">
          <div className="vidwrap">
            <video id="camvideo"></video>
          </div>
        </div>
      </div>
    </AppWindow>
  );
};
