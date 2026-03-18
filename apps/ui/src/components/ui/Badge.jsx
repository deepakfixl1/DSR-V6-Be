import React from "react";

const Badge = ({ tone = "neutral", children }) => {
  return <span className={`badge badge-${tone}`}>{children}</span>;
};

export default Badge;
