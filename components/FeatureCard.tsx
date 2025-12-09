
import React from 'react';
import { Feature } from '../types';
import * as LucideIcons from 'lucide-react';

interface FeatureCardProps {
  feature: Feature;
  onClick: (feature: Feature) => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ feature, onClick }) => {
  // Dynamically get the icon component
  const IconComponent = (LucideIcons as any)[feature.icon] || LucideIcons.HelpCircle;

  return (
    <div 
      onClick={() => onClick(feature)}
      className="group bg-white rounded-[2rem] p-6 border border-slate-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] transition-all duration-300 cursor-pointer relative overflow-hidden hover:-translate-y-1 h-full flex flex-col"
    >
      <div className="flex justify-between items-start mb-6">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${feature.bgColor}`}>
           <IconComponent size={28} color={feature.color} />
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 text-${feature.color}`}>
             <LucideIcons.ArrowUpRight size={18} color={feature.color} />
          </div>
        </div>
      </div>

      <div className="mb-2">
        <span className={`text-xs font-bold uppercase tracking-wider opacity-80 mb-1 block`} style={{ color: feature.color }}>
          {feature.subtitle}
        </span>
        <h3 className="text-xl font-extrabold text-slate-800 leading-tight">
          {feature.title}
        </h3>
      </div>
      
      <p className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-3 mt-2">
        {feature.description}
      </p>
    </div>
  );
};

export default FeatureCard;
