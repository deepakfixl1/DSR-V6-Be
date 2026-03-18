import React from "react";

const SplitPane = ({ left, right, className = "" }) => {
  return (
    <div className={`split-pane ${className}`}>
      <div className="split-pane-left">{left}</div>
      <div className="split-pane-right">{right}</div>
    </div>
  );
};

export default SplitPane;
