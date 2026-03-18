import React from "react";

const Card = ({ title, subtitle, children, className = "" }) => {
  return (
    <div className={`card ${className}`}>
      {(title || subtitle) && (
        <div className="card-header">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
};

export default Card;
