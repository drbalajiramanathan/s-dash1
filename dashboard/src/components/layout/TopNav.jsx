import React from 'react';
import {
    Activity, Footprints, Utensils, Brain, Thermometer,
    Heart, MapPin, ArrowLeftRight, Zap, Droplets, CloudSun
} from 'lucide-react';

export default function TopNav({ activeModule, onSelectModule }) {
    const modules = [
        { id: 'posture', name: 'Posture (Legacy)', icon: Activity, color: 'bg-slate-500/60 hover:bg-slate-500/80', border: 'border-slate-400' },
        { id: 'behavior', name: 'Behavior & Nutrition', icon: Utensils, color: 'bg-blue-500/60 hover:bg-blue-500/80', border: 'border-blue-400' },
        { id: 'health', name: 'Health & Repro', icon: Heart, color: 'bg-red-500/60 hover:bg-red-500/80', border: 'border-red-400' },
        { id: 'env', name: 'Env & Comfort', icon: CloudSun, color: 'bg-green-500/60 hover:bg-green-500/80', border: 'border-green-400' },
        { id: 'overview', name: 'Overview', icon: Zap, color: 'bg-purple-500/60 hover:bg-purple-500/80', border: 'border-purple-400' },
    ];

    return (
        <div className="w-full px-8 pt-4 flex items-end gap-1 overflow-x-auto no-scrollbar z-20">
            {modules.map((mod) => {
                const isActive = activeModule === mod.id;
                const Icon = mod.icon;

                return (
                    <div key={mod.id} className="relative group">
                        <button
                            onClick={() => onSelectModule(mod.id)}
                            className={`
                relative flex items-center gap-2 px-6 py-2 rounded-t-xl transition-all duration-300 border-t border-r border-l 
                ${isActive
                                    ? `bg-white text-slate-900 font-bold z-10 -mb-[1px] pb-3 -translate-y-1 border-white/50`
                                    : `${mod.color} text-white backdrop-blur-md border-white/20 hover:-translate-y-1 shadow-lg`
                                }
                mr-1 last:mr-0
              `}
                        >
                            <Icon size={18} className={isActive ? 'text-blue-600 drop-shadow-sm' : 'text-white drop-shadow-sm'} />
                            <span className={`text-sm whitespace-nowrap ${isActive ? 'text-slate-900' : 'text-white font-semibold drop-shadow-sm'}`}>
                                {mod.name}
                            </span>
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
