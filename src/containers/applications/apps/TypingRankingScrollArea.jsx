import React from "react";

export const TypingRankingScrollArea = ({ children, variant = "normal" }) => (
  <div className="typingRankingScrollArea" data-variant={variant}>
    <div className="typingRankingScrollFade isTop" aria-hidden="true" />
    <div className="typingRankingScrollViewport">{children}</div>
    <div className="typingRankingScrollFade isBottom" aria-hidden="true" />
  </div>
);
