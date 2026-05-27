import React from "react";
import { ToolBar } from "../../utils/general";

const parsePixelValue = (value) => {
  if (typeof value === "number") return value;
  if (typeof value !== "string" || !value.trim().endsWith("px")) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const clampCustomWindowStyle = (style = {}) => {
  const nextStyle = { ...style };
  const top = parsePixelValue(nextStyle.top);
  const left = parsePixelValue(nextStyle.left);

  if (top !== null) {
    const safeTop = Math.max(0, top);
    nextStyle.top = `${safeTop}px`;
    nextStyle.maxHeight = `calc(100% - ${safeTop}px)`;
  } else {
    nextStyle.maxHeight = "100%";
  }

  if (left !== null) {
    const safeLeft = Math.max(0, left);
    nextStyle.left = `${safeLeft}px`;
    nextStyle.maxWidth = `calc(100% - ${safeLeft}px)`;
  } else {
    nextStyle.maxWidth = "100%";
  }

  return nextStyle;
};

export const AppWindow = ({
  wnapp,
  app,
  icon,
  name,
  className = "",
  toolbarProps = {},
  rootProps = {},
  windowScreenClassName = "flex flex-col",
  restWindowClassName = "flex-grow flex flex-col",
  screenTop = null,
  children,
}) => {
  const { id = `${icon}App`, style: rootStyle, ...restRootProps } = rootProps;

  const customStyle =
    wnapp?.size === "cstm" ? clampCustomWindowStyle(wnapp.dim) : null;

  const mergedStyle = {
    ...customStyle,
    zIndex: wnapp?.z,
    ...rootStyle,
  };

  const rootClassName = `${className} floatTab dpShad`.trim();
  const screenClassName = `windowScreen ${windowScreenClassName}`.trim();
  const restClassName = restWindowClassName
    ? `restWindow ${restWindowClassName}`.trim()
    : "";

  return (
    <div
      className={rootClassName}
      data-size={wnapp.size}
      data-max={wnapp.max}
      style={mergedStyle}
      data-hide={wnapp.hide}
      id={id}
      {...restRootProps}
    >
      <ToolBar
        app={app}
        icon={icon}
        size={wnapp.size}
        name={name}
        {...toolbarProps}
      />
      <div className={screenClassName} data-dock="true">
        {screenTop}
        {restWindowClassName ? (
          <div className={restClassName}>{children}</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};
