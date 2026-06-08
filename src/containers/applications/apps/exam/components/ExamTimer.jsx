import React, { useState, useEffect } from "react";
import { Icon } from "../../../../../utils/general.jsx";

export const ExamTimer = ({ minutes, onTimeUp }) => {
  const totalMinutes = Number(minutes || 0);
  const [secondsLeft, setSecondsLeft] = useState(totalMinutes * 60);

  useEffect(() => {
    setSecondsLeft(totalMinutes * 60);
  }, [totalMinutes]);

  useEffect(() => {
    if (totalMinutes <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [totalMinutes, onTimeUp]);

  if (totalMinutes <= 0) return null;

  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  const isUrgent = secondsLeft < 60;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 rounded-full border-2 transition-all ${
        isUrgent
          ? "border-red-500 bg-red-50 text-red-600 animate-pulse"
          : "border-blue-500 bg-blue-50 text-blue-700"
      }`}
    >
      <Icon fafa="faClock" width={16} />
      <span className="font-black text-lg tabular-nums">
        {m.toString().padStart(2, "0")}:{s.toString().padStart(2, "0")}
      </span>
    </div>
  );
};
