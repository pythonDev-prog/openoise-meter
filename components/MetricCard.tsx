
import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: string;
  colorClass?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, unit, icon, colorClass = "text-white" }) => {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col justify-between shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        {icon && <i className={`${icon} text-slate-400 text-sm`}></i>}
        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold tracking-tight ${colorClass}`}>{value}</span>
        {unit && <span className="text-slate-500 text-sm font-medium">{unit}</span>}
      </div>
    </div>
  );
};

export default MetricCard;
