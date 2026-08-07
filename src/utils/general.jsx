import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSelector, useDispatch } from "react-redux";
import "./general.scss";
import { LazyLoadImage } from "react-lazy-load-image-component";

import * as FaIcons from "@fortawesome/free-solid-svg-icons";
import * as FaRegIcons from "@fortawesome/free-regular-svg-icons";
import * as AllIcons from "./icons";

String.prototype.strip = function (c) {
  var i = 0,
    j = this.length - 1;
  while (this[i] === c) i++;
  while (this[j] === c) j--;
  return this.slice(i, j + 1);
};

String.prototype.count = function (c) {
  var result = 0,
    i = 0;
  for (i; i < this.length; i++) if (this[i] == c) result++;
  return result;
};

export const Icon = (props) => {
  const sidepane = useSelector((state) => state.sidepane);

  const dispatch = useDispatch();
  var src = `img/icon/${props.ui != null ? "ui/" : ""}${props.src}.png`;
  if (props.ext != null || (props.src && props.src.includes("http"))) {
    src = props.src;
  } else if (props.src === "chat") {
    src = `img/icon/chat.svg`;
  } else if (props.src === "atalhos") {
    src = `img/icon/atalhos.svg`;
  } else if (props.src === "exam") {
    src = `img/icon/exam.svg`;
  } else if (props.src === "attendance") {
    src = `img/icon/attendance.svg`;
  } else if (props.src === "booklets") {
    src = `img/icon/booklets.svg`;
  } else if (props.src === "imagegen") {
    src = `img/icon/imagegen.svg`;
  } else if (props.src === "lessons") {
    src = `img/icon/lessons.svg`;
  } else if (props.src === "drawing") {
    src = `img/icon/drawing.svg`;
  } else if (props.src === "quiz") {
    src = `img/icon/quiz.svg`;
  } else if (props.src === "pcBuilder") {
    src = `img/icon/win/thispc.png`;
  }

  const iconScale = ["typing", "typingKids"].includes(props.src) ? 1.3 : 1;
  const iconWidth = props.width
    ? Math.round(props.width * iconScale)
    : props.width;
  const iconHeight = props.height
    ? Math.round(props.height * iconScale)
    : props.height;

  var prtclk = "";
  if (props.src) {
    if (props.onClick != null || props.pr != null) {
      prtclk = "prtclk";
    }
  }

  const clickDispatch = (event) => {
    if (!sidepane.banhide) dispatch({ type: "BANDHIDE" });

    var action = {
      type: event.currentTarget.dataset.action,
      payload: event.currentTarget.dataset.payload,
    };

    if (action.type) {
      dispatch(action);
    }
  };

  if (props.fafa != null) {
    return (
      <div
        className={`uicon prtclk ${props.className || ""}`}
        onClick={props.onClick || (props.click && clickDispatch) || null}
        data-action={props.click}
        data-payload={props.payload}
        data-menu={props.menu}
      >
        <FontAwesomeIcon
          data-flip={props.flip != null}
          data-invert={props.invert != null ? "true" : "false"}
          data-rounded={props.rounded != null ? "true" : "false"}
          style={{
            width: props.width,
            height: props.height || props.width,
            color: props.color || null,
            margin: props.margin || null,
          }}
          icon={
            props.reg == null ? FaIcons[props.fafa] : FaRegIcons[props.fafa]
          }
        />
      </div>
    );
  } else if (props.icon != null) {
    var CustomIcon = AllIcons[props.icon];
    return (
      <div
        className={`uicon prtclk ${props.className || ""}`}
        onClick={props.onClick || (props.click && clickDispatch) || null}
        data-action={props.click}
        data-payload={props.payload}
        data-menu={props.menu}
      >
        <CustomIcon
          data-flip={props.flip != null}
          data-invert={props.invert != null ? "true" : "false"}
          data-rounded={props.rounded != null ? "true" : "false"}
          style={{
            width: props.width,
            height: props.height || props.width,
            fill: props.color || null,
            margin: props.margin || null,
          }}
        />
      </div>
    );
  } else {
    return (
      <div
        className={`uicon ${props.className || ""} ${prtclk}`}
        data-open={props.open}
        data-action={props.click}
        data-active={props.active}
        data-payload={props.payload}
        onClick={props.onClick || (props.pr && clickDispatch) || null}
        data-menu={props.menu}
        data-pr={props.pr}
      >
        {props.className == "tsIcon" ? (
          <div
            onClick={props.click != null ? clickDispatch : null}
            style={{ width: iconWidth, height: iconWidth }}
            data-action={props.click}
            data-payload={props.payload}
            data-click={props.click != null}
            data-flip={props.flip != null}
            data-invert={props.invert != null ? "true" : "false"}
            data-rounded={props.rounded != null ? "true" : "false"}
          >
            <img
              width={iconWidth}
              height={iconHeight}
              data-action={props.click}
              data-payload={props.payload}
              data-click={props.click != null}
              data-flip={props.flip != null}
              data-invert={props.invert != null ? "true" : "false"}
              data-rounded={props.rounded != null ? "true" : "false"}
              src={src}
              style={{
                margin: props.margin || null,
              }}
              alt=""
            />
          </div>
        ) : (
          <img
            width={iconWidth}
            height={iconHeight}
            onClick={props.click != null ? clickDispatch : null}
            data-action={props.click}
            data-payload={props.payload}
            data-click={props.click != null}
            data-flip={props.flip != null}
            data-invert={props.invert != null ? "true" : "false"}
            data-rounded={props.rounded != null ? "true" : "false"}
            src={src}
            style={{
              margin: props.margin || null,
            }}
            alt=""
          />
        )}
      </div>
    );
  }
};

export const Image = (props) => {
  const dispatch = useDispatch();
  var src = `img/${(props.dir ? props.dir + "/" : "") + props.src}.png`;
  if (props.ext != null) {
    src = props.src;
  }

  const errorHandler = (e) => {
    if (props.err) {
      e.currentTarget.src = props.err;
    }
  };

  const clickDispatch = (event) => {
    var action = {
      type: event.currentTarget.dataset.action,
      payload: event.currentTarget.dataset.payload,
    };

    if (action.type) {
      dispatch(action);
    }
  };

  return (
    <div
      className={`imageCont prtclk ${props.className || ""}`}
      id={props.id}
      style={{
        backgroundImage: props.back && `url(${src})`,
      }}
      data-back={props.back != null}
      onClick={props.onClick || (props.click && clickDispatch)}
      data-action={props.click}
      data-payload={props.payload}
      data-var={props.var}
    >
      {!props.back ? (
        props.lazy ? (
          <LazyLoadImage
            width={props.w}
            height={props.h}
            data-free={props.free != null}
            data-var={props.var}
            loading={props.lazy ? "lazy" : null}
            src={src}
            alt=""
            onError={errorHandler}
          />
        ) : (
          <img
            width={props.w}
            height={props.h}
            data-free={props.free != null}
            data-var={props.var}
            loading={props.lazy ? "lazy" : null}
            src={src}
            alt=""
            onError={errorHandler}
          />
        )
      ) : null}
    </div>
  );
};

export const SnapScreen = (props) => {
  const dispatch = useDispatch();
  const [delay, setDelay] = useState(false);
  const lays = useSelector((state) => state.globals.lays);

  const vr = "var(--radii)";

  const clickDispatch = (event) => {
    var action = {
      type: event.currentTarget.dataset.action,
      payload: event.currentTarget.dataset.payload,
      dim: JSON.parse(event.currentTarget.dataset.dim),
    };

    if (action.dim && action.type) {
      dispatch(action);
      props.closeSnap();
    }
  };

  useEffect(() => {
    if (delay && props.snap) {
      setTimeout(() => {
        setDelay(false);
      }, 500);
    } else if (props.snap) {
      setDelay(true);
    }
  });

  return props.snap || delay ? (
    <div className="snapcont mdShad" data-dark={props.invert != null}>
      {lays.map((x, i) => {
        return (
          <div key={i} className="snapLay">
            {x.map((y, j) => (
              <div
                key={j}
                className="snapper"
                style={{
                  borderTopLeftRadius: (y.br % 2 == 0) * 4,
                  borderTopRightRadius: (y.br % 3 == 0) * 4,
                  borderBottomRightRadius: (y.br % 5 == 0) * 4,
                  borderBottomLeftRadius: (y.br % 7 == 0) * 4,
                }}
                onClick={clickDispatch}
                data-dim={JSON.stringify(y.dim)}
                data-action={props.app}
                data-payload="resize"
              ></div>
            ))}
          </div>
        );
      })}
    </div>
  ) : null;
};

export const ToolBar = (props) => {
  const dispatch = useDispatch();
  const [snap, setSnap] = useState(false);

  const openSnap = () => {
    setSnap(true);
  };

  const closeSnap = () => {
    setSnap(false);
  };

  const toolClick = () => {
    dispatch({
      type: props.app,
      payload: "front",
    });
  };

  var posP = [0, 0],
    dimP = [0, 0],
    posM = [0, 0],
    wnapp = {},
    op = 0,
    vec = [0, 0];

  const toolDrag = (e) => {
    e = e || window.event;
    e.preventDefault();
    posM = [e.clientY, e.clientX];
    op = e.currentTarget.dataset.op;

    if (op == 0) {
      wnapp =
        e.currentTarget.parentElement &&
        e.currentTarget.parentElement.parentElement;
    } else {
      vec = e.currentTarget.dataset.vec.split(",");
      wnapp =
        e.currentTarget.parentElement &&
        e.currentTarget.parentElement.parentElement &&
        e.currentTarget.parentElement.parentElement.parentElement;
    }

    if (wnapp) {
      wnapp.classList.add("notrans");
      wnapp.classList.add("z9900");
      posP = [wnapp.offsetTop, wnapp.offsetLeft];
      dimP = [
        parseFloat(getComputedStyle(wnapp).height.replaceAll("px", "")),
        parseFloat(getComputedStyle(wnapp).width.replaceAll("px", "")),
      ];
    }

    document.onmouseup = closeDrag;
    document.onmousemove = eleDrag;
  };

  const setPos = (pos0, pos1) => {
    wnapp.style.top = pos0 + "px";
    wnapp.style.left = pos1 + "px";
  };

  const setDim = (dim0, dim1) => {
    wnapp.style.height = dim0 + "px";
    wnapp.style.width = dim1 + "px";
  };

  const getWindowBounds = () => {
    const layer = wnapp?.closest?.(".desktop");
    return {
      height: layer?.clientHeight || window.innerHeight,
      width: layer?.clientWidth || window.innerWidth,
    };
  };

  const clampGeometry = (pos0, pos1, dim0, dim1) => {
    const bounds = getWindowBounds();
    const height = Math.min(Math.max(dim0, 1), bounds.height);
    const width = Math.min(Math.max(dim1, 1), bounds.width);

    return {
      top: Math.min(Math.max(pos0, 0), Math.max(0, bounds.height - height)),
      left: Math.min(Math.max(pos1, 0), Math.max(0, bounds.width - width)),
      height,
      width,
    };
  };

  const eleDrag = (e) => {
    e = e || window.event;
    e.preventDefault();

    var pos0 = posP[0] + e.clientY - posM[0],
      pos1 = posP[1] + e.clientX - posM[1],
      dim0 = dimP[0] + vec[0] * (e.clientY - posM[0]),
      dim1 = dimP[1] + vec[1] * (e.clientX - posM[1]);

    if (op == 0) {
      const next = clampGeometry(pos0, pos1, dimP[0], dimP[1]);
      setPos(next.top, next.left);
    } else {
      dim0 = Math.max(dim0, 320);
      dim1 = Math.max(dim1, 320);
      pos0 = posP[0] + Math.min(vec[0], 0) * (dim0 - dimP[0]);
      pos1 = posP[1] + Math.min(vec[1], 0) * (dim1 - dimP[1]);
      const next = clampGeometry(pos0, pos1, dim0, dim1);
      setPos(next.top, next.left);
      setDim(next.height, next.width);
    }
  };

  const closeDrag = () => {
    document.onmouseup = null;
    document.onmousemove = null;

    wnapp.classList.remove("notrans");
    wnapp.classList.remove("z9900");

    var action = {
      type: props.app,
      payload: "resize",
      dim: {
        width: getComputedStyle(wnapp).width,
        height: getComputedStyle(wnapp).height,
        top: getComputedStyle(wnapp).top,
        left: getComputedStyle(wnapp).left,
      },
    };

    dispatch(action);
  };

  return (
    <>
      <div
        className="toolbar"
        data-float={props.float != null}
        data-noinvert={props.noinvert != null}
        style={{
          background: props.bg,
        }}
      >
        <div
          className="topInfo flex flex-grow items-center"
          data-float={props.float != null}
          onClick={toolClick}
          onMouseDown={toolDrag}
          data-op="0"
        >
          <Icon src={props.icon} width={14} />
          <div
            className="appFullName text-xss"
            data-white={props.invert != null}
          >
            {props.name}
          </div>
        </div>
        <div className="actbtns flex items-center">
          <Icon
            invert={props.invert}
            click={props.app}
            payload="mnmz"
            pr
            src="minimize"
            ui
            width={12}
          />
          <div
            className="snapbox h-full"
            data-hv={snap}
            onMouseOver={openSnap}
            onMouseLeave={closeSnap}
          >
            <Icon
              invert={props.invert}
              click={props.app}
              ui
              pr
              width={12}
              payload="mxmz"
              src={props.size == "full" ? "maximize" : "maxmin"}
            />
            <SnapScreen
              invert={props.invert}
              app={props.app}
              snap={snap}
              closeSnap={closeSnap}
            />
            {/* {snap?<SnapScreen app={props.app} closeSnap={closeSnap}/>:null} */}
          </div>
          <Icon
            className="closeBtn"
            invert={props.invert}
            click={props.app}
            payload="close"
            pr
            src="close"
            ui
            width={14}
          />
        </div>
      </div>
      <div className="resizecont topone">
        <div className="flex">
          <div
            className="conrsz cursor-nw-resize"
            data-op="1"
            onMouseDown={toolDrag}
            data-vec="-1,-1"
          ></div>
          <div
            className="edgrsz cursor-n-resize wdws"
            data-op="1"
            onMouseDown={toolDrag}
            data-vec="-1,0"
          ></div>
        </div>
      </div>
      <div className="resizecont leftone">
        <div className="h-full">
          <div
            className="edgrsz cursor-w-resize hdws"
            data-op="1"
            onMouseDown={toolDrag}
            data-vec="0,-1"
          ></div>
        </div>
      </div>
      <div className="resizecont rightone">
        <div className="h-full">
          <div
            className="edgrsz cursor-w-resize hdws"
            data-op="1"
            onMouseDown={toolDrag}
            data-vec="0,1"
          ></div>
        </div>
      </div>
      <div className="resizecont bottomone">
        <div className="flex">
          <div
            className="conrsz cursor-ne-resize"
            data-op="1"
            onMouseDown={toolDrag}
            data-vec="1,-1"
          ></div>
          <div
            className="edgrsz cursor-n-resize wdws"
            data-op="1"
            onMouseDown={toolDrag}
            data-vec="1,0"
          ></div>
          <div
            className="conrsz cursor-nw-resize"
            data-op="1"
            onMouseDown={toolDrag}
            data-vec="1,1"
          ></div>
        </div>
      </div>
    </>
  );
};

export const LazyComponent = ({ show, children }) => {
  const [loaded, setLoad] = useState(false);

  useEffect(() => {
    if (show && !loaded) setLoad(true);
  }, [show]);

  return show || loaded ? <>{children}</> : null;
};
