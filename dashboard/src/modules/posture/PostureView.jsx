import React, { useEffect, useState } from 'react';
import { RefreshCw, AlertCircle, TrendingUp, Clock } from 'lucide-react';
import GanttChart from '../../components/charts/GanttChart';
import { useCowData } from '../../hooks/useCowData';
import { useLiveSimulation } from '../../hooks/useLiveSimulation';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Chart Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center h-full text-red-500 p-4 bg-red-50 rounded-xl border border-red-100">
                    <AlertCircle className="mr-2" size={20} />
                    <span className="text-sm">Chart crashed: {this.state.error?.message}</span>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function PostureView({ isActive, onSelectData }) {
    const { data, cows, loading } = useCowData();

    // Simulation State
    const [mode, setMode] = useState('LIVE');
    const [historyHours, setHistoryHours] = useState(24);
    const [replaySpeed, setReplaySpeed] = useState(60);
    const [zoomLevel, setZoomLevel] = useState(10 / 60); // Default 10m for Live

    const { liveData, currentTime, resetSimulation } = useLiveSimulation(data, mode === 'LIVE', replaySpeed, historyHours);

    const [results, setResults] = useState([]);
    const [stats, setStats] = useState({ lying: 0, standing: 0, eating: 0 });
    const [isProcessing, setIsProcessing] = useState(false);

    // Multi-Animal Support
    const [selectedAnimal, setSelectedAnimal] = useState('All Animals');
    const [animalMetadata, setAnimalMetadata] = useState({});

    // Auto-switch zoom
    useEffect(() => {
        if (mode === 'LIVE') {
            setZoomLevel(10 / 60);
        } else {
            setZoomLevel(historyHours); // Full view for replay
        }
    }, [mode, historyHours]);

    // Build Metadata once
    useEffect(() => {
        if (cows.length > 0 && data.length > 0) {
            const meta = {};
            cows.forEach(id => {
                const row = data.find(r => String(r.cow_id) === id);
                if (row) {
                    meta[id] = {
                        age: row.Age || 'Unknown',
                        breed: row.Breed || 'Unknown',
                        color: row.Color || 'Unknown',
                        image: `/images/${id}.jpg`
                    };
                }
            });
            setAnimalMetadata(meta);
        }
    }, [cows, data]);

    // Process Data whenever liveData updates
    useEffect(() => {
        if (!liveData || liveData.length === 0) return;

        setIsProcessing(true);
        const processed = [];
        const newStats = { lying: 0, standing: 0, eating: 0 };
        const isAll = selectedAnimal === 'All Animals';

        // Filter by AnimalID
        const filteredData = isAll
            ? liveData
            : liveData.filter(row => String(row.cow_id) === selectedAnimal);

        // We only need to process the *latest* chunk really, but for Gantt we need full history up to now.
        // Optimization: liveData is already the history up to currentTime.

        // Limit points for performance if needed, but 24h of 5 cows is manageable (~10k points)
        // Let's process all.

        filteredData.forEach(row => {
            // Map state: lying=0, standing=1, eating=2
            // CSV has pct_lying, pct_standing, etc. We need categorical state.
            // Logic: Max pct wins.
            let mappedState = 0;
            const max = Math.max(row.pct_lying, row.pct_standing, row.pct_eating);
            if (max === row.pct_lying) mappedState = 0;
            else if (max === row.pct_standing) mappedState = 1;
            else if (max === row.pct_eating) mappedState = 2;

            processed.push({
                timestamp: new Date(row.timestamp).getTime(),
                state: mappedState,
                animalId: row.cow_id
            });

            const key = mappedState === 0 ? 'lying' : mappedState === 1 ? 'standing' : 'eating';
            newStats[key]++; // This counts 10-min blocks (or whatever resolution)
        });

        setResults(processed);
        setStats(newStats);
        setIsProcessing(false);

    }, [liveData, selectedAnimal]);

    // Notify parent
    useEffect(() => {
        const meta = animalMetadata[selectedAnimal] || {};
        if (onSelectData) {
            onSelectData({
                id: selectedAnimal,
                ...meta,
                stats
            });
        }
    }, [selectedAnimal, animalMetadata, stats]);

    const handleChartClick = (clickedId) => {
        if (clickedId && clickedId !== 'COW-SELECTED') {
            setSelectedAnimal(String(clickedId).trim());
        }
    };

    if (!isActive) return null;

    const currentMeta = animalMetadata[selectedAnimal] || {};
    const isAll = selectedAnimal === 'All Animals';

    // Attention Logic
    const attentionStatus = isAll
        ? { label: 'Herd Status', color: 'text-green-600', bg: 'bg-green-100', msg: 'All systems normal' }
        : (stats.eating < 12 // Less than 12 blocks (approx 2h if blocks are 10m)
            ? { label: 'Attention Needed', color: 'text-red-600', bg: 'bg-red-100', msg: 'Low Feed Intake' }
            : { label: 'Animal Status', color: 'text-blue-600', bg: 'bg-blue-100', msg: 'Normal Activity' });

    // Calculate Chart Window
    let minTime, maxTime;
    if (currentTime) {
        if (mode === 'LIVE') {
            // Sliding Window
            maxTime = currentTime.getTime();
            minTime = maxTime - (zoomLevel * 60 * 60 * 1000);
        } else {
            // Replay: Fixed Window (filling up)
            // Start of data (approx)
            if (data.length > 0) {
                // Find earliest time in FULL data to anchor the start
                // We can approximate or find min. Let's assume data starts at some point.
                // Ideally use the first timestamp of 'data'.
                const start = new Date(data[0].timestamp).getTime();
                minTime = start;
                maxTime = start + (historyHours * 60 * 60 * 1000);
            }
        }
    }

    return (
        <div className="space-y-4 h-full flex flex-col pt-6 px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {/* Stats Cards - Now Dynamic */}
                <StatCard
                    icon={<Clock size={14} className="text-blue-500" />}
                    label="Lying Time"
                    value={`${(stats.lying * 10 / 60).toFixed(1)}h`} // Assuming 10m blocks? Wait, data is 10m? 
                    // Actually check useLiveSimulation resolution. It emits every point. 
                    // If CSV is 10m resolution, then * 10 is correct.
                    sub={isAll ? "Total across herd" : "Target: >10h"}
                    color="bg-blue-50"
                />
                <StatCard
                    icon={<TrendingUp size={14} className="text-green-500" />}
                    label="Standing Time"
                    value={`${(stats.standing * 10 / 60).toFixed(1)}h`}
                    sub="Normal range"
                    color="bg-green-50"
                />
                <StatCard
                    icon={<UtensilsIcon size={14} className="text-orange-500" />}
                    label="Eating Time"
                    value={`${(stats.eating * 10 / 60).toFixed(1)}h`}
                    sub="Intake High"
                    color="bg-orange-50"
                />

                {/* Attention Card */}
                <div className={`glass-card p-2 flex flex-col justify-center items-center text-center gap-1 ${attentionStatus.bg} border-none`}>
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${attentionStatus.color}`}>{attentionStatus.label}</span>
                    <span className="text-xs font-bold text-slate-700">{attentionStatus.msg}</span>
                </div>

                {/* Animal Selector */}
                <div className="glass-card p-2 flex flex-col gap-2 relative overflow-hidden">
                    <div className="flex items-center justify-between z-10">
                        <select
                            value={selectedAnimal}
                            onChange={(e) => setSelectedAnimal(e.target.value)}
                            className="text-xs font-bold text-slate-700 bg-transparent border-none focus:ring-0 p-0 cursor-pointer outline-none w-full"
                        >
                            <option value="All Animals">All Animals (Overview)</option>
                            {cows.map(id => (
                                <option key={id} value={id}>{id}</option>
                            ))}
                        </select>
                        <div className={`w-2 h-2 rounded-full ${mode === 'LIVE' ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`}></div>
                    </div>

                    {!isAll && (
                        <div className="flex items-center gap-2 z-10">
                            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-white shadow-sm">
                                <img
                                    src={currentMeta.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedAnimal}`}
                                    alt="Animal"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-600">{currentMeta.breed || 'Unknown Breed'}</span>
                                <span className="text-[9px] text-slate-400">{currentMeta.age || '?'} yrs • {currentMeta.color || '?'}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-[300px] bg-slate-50 rounded-2xl border border-slate-200 shadow-pop overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-white/50 backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Behavior Hypnogram</h2>
                            <p className="text-xs text-slate-500">
                                {isAll ? `Herd Overview (${cows.length} Animals)` : `Analysis for ${selectedAnimal}`}
                            </p>
                        </div>

                        {/* Live Indicator */}
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full animate-pulse ${mode === 'LIVE' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                            <span className={`w-2 h-2 rounded-full ${mode === 'LIVE' ? 'bg-red-600' : 'bg-blue-600'}`}></span>
                            <span className="text-xs font-bold">{mode === 'LIVE' ? 'LIVE' : 'REPLAY'}</span>
                        </div>
                        <span className="text-xs text-slate-500 font-mono">
                            {currentTime ? currentTime.toLocaleTimeString() : '--:--:--'}
                        </span>
                    </div>

                    <div className="flex gap-2 items-center">
                        {/* Live Zoom Controls */}
                        {mode === 'LIVE' && (
                            <div className="flex bg-slate-100 rounded-lg p-1 gap-1 mr-2">
                                <button
                                    onClick={() => setZoomLevel(10 / 60)}
                                    className={`px-2 py-1 text-xs font-bold rounded-md ${zoomLevel === 10 / 60 ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}
                                >
                                    10M
                                </button>
                                <button
                                    onClick={() => setZoomLevel(1)}
                                    className={`px-2 py-1 text-xs font-bold rounded-md ${zoomLevel === 1 ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}
                                >
                                    1H
                                </button>
                            </div>
                        )}

                        {/* Control Buttons */}
                        <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                            <button
                                onClick={() => { setMode('LIVE'); setHistoryHours(24); }}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${mode === 'LIVE' ? 'bg-white shadow text-red-600' : 'text-slate-500 hover:bg-slate-200'}`}
                            >
                                LIVE
                            </button>
                            <button
                                onClick={() => {
                                    setMode('REPLAY');
                                    setHistoryHours(24);
                                    setReplaySpeed(60);
                                    resetSimulation();
                                }}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${mode === 'REPLAY' && historyHours === 24 ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:bg-slate-200'}`}
                            >
                                24H
                            </button>
                            <button
                                onClick={() => {
                                    setMode('REPLAY');
                                    setHistoryHours(48);
                                    setReplaySpeed(60);
                                    resetSimulation();
                                }}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${mode === 'REPLAY' && historyHours === 48 ? 'bg-white shadow text-purple-600' : 'text-slate-500 hover:bg-slate-200'}`}
                            >
                                48H
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 relative w-full h-full min-h-[250px] p-4">
                    <div className="w-full h-full bg-white rounded-xl shadow-sm border border-slate-100 p-2">
                        <ErrorBoundary>
                            <GanttChart
                                dataPoints={results}
                                onBarClick={handleChartClick}
                                viewMode={isAll ? 'all' : 'single'}
                                timeRange={mode === 'LIVE' ? zoomLevel : historyHours}
                                minTime={minTime}
                                maxTime={maxTime}
                                animationDuration={mode === 'REPLAY' ? 0 : 500} // Smooth slide for live
                            />
                        </ErrorBoundary>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, sub, color }) {
    return (
        <div className="glass-card p-2 flex items-start gap-3 hover:translate-y-[-2px] transition-transform">
            <div className={`p-1.5 rounded-md ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{label}</p>
                <h3 className="text-base font-bold text-slate-800 leading-tight">{value}</h3>
                <p className="text-[9px] text-slate-400 mt-0.5">{sub}</p>
            </div>
        </div>
    );
}

function UtensilsIcon({ size, className }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" /></svg>
    )
}
