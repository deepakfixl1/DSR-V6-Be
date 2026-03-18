import React from "react";

const ChartPlaceholder = ({ title = "Trend" }) => {
  return (
    <div className="chart-placeholder">
      <div className="chart-grid" />
      <p>{title}</p>
    </div>
  );
};

export default ChartPlaceholder;
