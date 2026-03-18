import React from "react";

const DataTable = ({ columns, rows }) => {
  return (
    <div className="data-table">
      <div className="data-row data-head">
        {columns.map((col) => (
          <span key={col}>{col}</span>
        ))}
      </div>
      {rows.map((row, index) => (
        <div className="data-row" key={index}>
          {row.map((cell, cellIndex) => (
            <span key={cellIndex}>{cell}</span>
          ))}
        </div>
      ))}
    </div>
  );
};

export default DataTable;
