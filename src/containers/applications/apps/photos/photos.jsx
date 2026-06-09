import "./photos.scss";
import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Icon } from "../../../../utils/general";
import { AppWindow } from "../../../../components/shared/AppWindow";

const IMAGE_TYPES = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

const clampZoom = (value) => Math.min(300, Math.max(25, value));

export const Photos = () => {
  const wnapp = useSelector((state) => state.apps.photos);
  const files = useSelector((state) => state.files);
  const [zoom, setZoom] = useState(100);
  const [fit, setFit] = useState(true);
  const [rotation, setRotation] = useState(0);

  const image = useMemo(() => {
    if (!wnapp?.payload || typeof wnapp.payload !== "string") return null;
    const fileItem = files.data.getId(wnapp.payload);
    if (!fileItem || !IMAGE_TYPES.has(fileItem.type)) return null;
    return fileItem;
  }, [files.data, files.revision, wnapp?.payload]);

  useEffect(() => {
    setZoom(100);
    setFit(true);
    setRotation(0);
  }, [image?.id]);

  const title = image ? `${image.name} - Fotos` : "Fotos";

  const updateZoom = (delta) => {
    setFit(false);
    setZoom((current) => clampZoom(current + delta));
  };

  const resetView = () => {
    setZoom(100);
    setFit(true);
    setRotation(0);
  };

  return (
    <AppWindow
      wnapp={wnapp}
      app={wnapp.action}
      icon={wnapp.icon}
      name={title}
      className="wnPhotos"
      toolbarProps={{ bg: "#171717", invert: true }}
      windowScreenClassName="flex flex-col"
      restWindowClassName="flex-grow flex flex-col"
    >
      <div className="photosLayout">
        <div className="photosCommandBar">
          <div className="photosFileName" title={image?.name || "Fotos"}>
            {image?.name || "Fotos"}
          </div>
          <div
            className="photosControls"
            aria-label="Controles de visualização"
          >
            <button
              type="button"
              title="Diminuir zoom"
              onClick={() => updateZoom(-25)}
              disabled={!image}
            >
              <Icon fafa="faMagnifyingGlassMinus" width={14} />
            </button>
            <button
              type="button"
              title="Ajustar à janela"
              onClick={resetView}
              disabled={!image}
            >
              <Icon fafa="faExpand" width={14} />
            </button>
            <button
              type="button"
              title="Aumentar zoom"
              onClick={() => updateZoom(25)}
              disabled={!image}
            >
              <Icon fafa="faMagnifyingGlassPlus" width={14} />
            </button>
            <button
              type="button"
              title="Girar"
              onClick={() => setRotation((current) => (current + 90) % 360)}
              disabled={!image}
            >
              <Icon fafa="faRotateRight" width={14} />
            </button>
          </div>
        </div>

        <div className="photosStage win11Scroll">
          {image?.data ? (
            <img
              src={image.data}
              alt={image.name}
              data-fit={fit}
              style={{
                transform: `rotate(${rotation}deg)`,
                width: fit ? undefined : `${zoom}%`,
              }}
            />
          ) : (
            <div className="photosEmpty">
              <Icon src="photos" width={56} />
              <strong>Nenhuma imagem selecionada</strong>
            </div>
          )}
        </div>
      </div>
    </AppWindow>
  );
};
