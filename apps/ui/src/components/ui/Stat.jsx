import React from "react";

const Stat = ({ label, value, trend }) => {
  return (
    <div className="stat">
      <p>{label}</p>
      <div className="stat-row">
        <h4>{value}</h4>
        {trend && <span className="stat-trend">{trend}</span>}
      </div>
    </div>
  );
};

export default Stat;
