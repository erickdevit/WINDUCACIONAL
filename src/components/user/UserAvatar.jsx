import React from "react";
import "../../index.css";
import { getUserInitials } from "../../lib/ui";

export const UserAvatar = ({ user, size = 40, className = "" }) => {
  return (
    <div
      className={`userAvatar ${className}`.trim()}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      aria-hidden="true"
    >
      {getUserInitials(user)}
    </div>
  );
};
