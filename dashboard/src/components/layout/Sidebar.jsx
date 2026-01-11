import React, { useState } from 'react';
import { LayoutDashboard, Tractor, Sprout, Warehouse, ChevronRight, ChevronLeft } from 'lucide-react';

export default function Sidebar({ activeFarm, onSelectFarm }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const farms = [
        { id: 'farm1', name: 'Sunny Pastures', icon: Tractor },
        { id: 'farm2', name: 'Green Valley', icon: Sprout },
        { id: 'farm3', name: 'Highland Cattle', icon: Warehouse },
    ];

    return (
        <div
            className={`fixed left-0 top-0 h-screen bg-white/10 backdrop-blur-xl border-r border-white/30 shadow-[10px_0_30px_rgba(0,0,0,0.2)] z-30 transition-all duration-300 ease-in-out flex flex-col ${isExpanded ? 'w-64' : 'w-20'
                }`}
        >
            {/* Header / Toggle */}
            <div className="h-24 flex items-center justify-center border-b border-white/50 relative">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-3 rounded-xl bg-blue-500 text-white shadow-glow hover:scale-105 transition-transform"
                >
                    <LayoutDashboard size={24} />
                </button>
                {isExpanded && (
                    <span className="ml-3 font-bold text-xl text-slate-700 animate-fade-in">S-DASH</span>
                )}

                {/* Toggle Arrow */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="absolute -right-3 top-10 bg-white rounded-full p-1 shadow-md text-slate-400 hover:text-blue-500"
                >
                    {isExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                </button>
            </div>

            {/* Farm List */}
            <div className="flex-1 py-6 px-3 space-y-3">
                {farms.map((farm) => {
                    const Icon = farm.icon;
                    const isActive = activeFarm === farm.id;

                    return (
                        <button
                            key={farm.id}
                            onClick={() => { onSelectFarm(farm.id); setIsExpanded(false); }}
                            className={`w-full flex items-center p-3 rounded-xl transition-all duration-300 group relative overflow-hidden ${isActive
                                ? 'bg-white shadow-card text-blue-600'
                                : 'hover:bg-white/50 text-slate-500'
                                }`}
                        >
                            <div className="relative z-10 flex items-center">
                                <Icon size={24} className={isActive ? 'text-blue-500' : 'text-slate-400'} />
                                {isExpanded && (
                                    <span className="ml-3 font-medium whitespace-nowrap">{farm.name}</span>
                                )}
                            </div>

                            {/* Active Indicator Line */}
                            {isActive && !isExpanded && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
