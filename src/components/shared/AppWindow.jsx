import React from "react";
import { ToolBar } from "../../utils/general";

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

  const mergedStyle = {
    ...(wnapp?.size === "cstm" ? wnapp.dim : null),
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
