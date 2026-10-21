import React from 'react';
import '../../results-design.css';

const Card = ({ title, children, className = '', icon: Icon, action, allowOverflow = false }) => (
  <div className={`glass-panel flex flex-col ${allowOverflow ? 'overflow-visible' : 'overflow-hidden'} ${className}`}>
    {title && (
      <div className="card-header-ngr">
        <h2 className="title flex items-center gap-3">
          {Icon && <Icon size={16} className="icon" />}
          {title}
        </h2>
        {action}
      </div>
    )}
    <div className="p-6 flex-grow">
      {children}
    </div>
  </div>
);

export default Card;
