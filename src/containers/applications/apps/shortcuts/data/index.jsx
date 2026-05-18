import React from "react";

import sistema from "./sistema";
import janelas from "./janelas";
import explorer from "./explorer";
import edicao from "./edicao";
import captura from "./captura";
import navegador from "./navegador";
import terminal from "./terminal";
import vscode from "./vscode";
import discord from "./discord";
import word from "./word";
import excel from "./excel";

export const shortcutGroups = [
  sistema,
  janelas,
  explorer,
  edicao,
  captura,
  navegador,
  terminal,
  vscode,
  discord,
  word,
  excel,
];

const svgProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const CategoryIcons = {
  sistema: (
    <svg {...svgProps}>
      <circle cx="10" cy="10" r="3" />
      <path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M3.7 3.7l1.4 1.4M14.9 14.9l1.4 1.4M3.7 16.3l1.4-1.4M14.9 5.1l1.4-1.4" />
    </svg>
  ),
  janelas: (
    <svg {...svgProps}>
      <rect x="2" y="3" width="16" height="14" rx="2" />
      <path d="M2 7h16M10 7v10" />
    </svg>
  ),
  explorer: (
    <svg {...svgProps}>
      <path d="M2 5a2 2 0 012-2h4l2 3h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
    </svg>
  ),
  edicao: (
    <svg {...svgProps}>
      <path d="M12.5 2.5l5 5L7 18H2v-5L12.5 2.5z" />
      <path d="M10 5l5 5" />
    </svg>
  ),
  captura: (
    <svg {...svgProps}>
      <rect x="3" y="3" width="14" height="14" rx="2" />
      <path d="M3 7h14" />
      <path d="M7 7v10" />
    </svg>
  ),
  navegador: (
    <svg {...svgProps}>
      <circle cx="10" cy="10" r="8" />
      <path d="M2 10h16" />
      <path d="M10 2c3 0 5 3.5 5 8s-2 8-5 8-5-3.5-5-8 2-8 5-8z" />
    </svg>
  ),
  terminal: (
    <svg {...svgProps}>
      <rect x="2" y="4" width="16" height="12" rx="2" />
      <path d="M5 8l3 3-3 3" />
      <path d="M10 14h5" />
    </svg>
  ),
  vscode: (
    <svg {...svgProps}>
      <path d="M14 2L2 8l4 4-4 4 12 6V2z" />
      <path d="M6 12l8 6V2l-8 6" />
    </svg>
  ),
  discord: (
    <svg {...svgProps}>
      <path d="M15 5c-1-1-2.5-1-2.5-1l-.5 1c2 .5 3 1.5 3 1.5s-1-.5-2.5-1-3-.5-4.5-.5-3 0-4.5.5S1.5 7.5 1.5 7.5 2.5 6.5 4.5 6l-.5-1s-1.5 0-2.5 1C.5 8 0 13 0 13s1 1.5 3 2c0 0 .5-1 1-1.5-1.5-.5-2-1.5-2-1.5s.5.5 1 1c1.5 1 3.5 1.5 5.5 1.5s4-.5 5.5-1.5c.5-.5 1-1 1-1s-.5 1-2 1.5c.5.5 1 1.5 1 1.5s2-.5 3-2c0 0-.5-5-1.5-7z" />
      <circle cx="6.5" cy="10.5" r="1.5" />
      <circle cx="11.5" cy="10.5" r="1.5" />
    </svg>
  ),
  word: (
    <svg {...svgProps}>
      <rect x="3" y="2" width="14" height="16" rx="2" />
      <path d="M7 6h6M7 10h6M7 14h4" />
    </svg>
  ),
  excel: (
    <svg {...svgProps}>
      <rect x="3" y="2" width="14" height="16" rx="2" />
      <path d="M3 6h14M3 10h14M3 14h14M8 2v16M13 2v16" />
    </svg>
  ),
};
