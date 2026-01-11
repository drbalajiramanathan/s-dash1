import React, { useState, useMemo } from 'react';
import { useCowData } from '../../hooks/useCowData';
import { useLiveSimulation } from '../../hooks/useLiveSimulation';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    TimeScale
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    TimeScale
);

export default function BehaviorView({ selectedCow, onSelectCow }) {
    const { data, cows, loading } = useCowData();

    const [mode, setMode] = useState('LIVE'); // 'LIVE' | 'REPLAY'
    const [historyHours, setHistoryHours] = useState(24);
    const [replaySpeed, setReplaySpeed] = useState(60); // 1 hour per second
    const [zoomLevel, setZoomLevel] = useState(10 / 60); // Default to 10m for LIVE

    const { liveData, currentTime, resetSimulation } = useLiveSimulation(data, mode === 'LIVE', replaySpeed, historyHours);

    // Default to first cow if none selected
    const currentCow = selectedCow || (cows.length > 0 ? cows[0] : 'COW_01');

    // Update parent when cows load if needed
    React.useEffect(() => {
        if (!selectedCow && cows.length > 0) {
            if (onSelectCow) onSelectCow(cows[0]);
        }
    }, [cows, selectedCow, onSelectCow]);

    // Auto-switch zoom when entering LIVE mode
    React.useEffect(() => {
        if (mode === 'LIVE') {
            setZoomLevel(10 / 60); // Default to 10m zoom for Live
        } else {
            setZoomLevel(historyHours === 48 ? 48 : 12);
        }
    }, [mode, historyHours]);

    const chartData = useMemo(() => {
        if (!liveData || !liveData.length) return null;

        const cowData = liveData.filter(d => d.cow_id === currentCow);
        // Sort by timestamp just in case
        cowData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Pulsation Logic (runs on every data update ~100ms)
        // Oscillates radius between 10px and 15px
        const pulseRadius = Math.abs(Math.sin(Date.now() / 200)) * 5 + 10;

        // Helper for Comet Tail Effect
        const getPointRadius = (ctx) => {
            const index = ctx.dataIndex;
            const count = ctx.dataset.data.length;
            const dist = count - 1 - index;

            if (dist === 0) return pulseRadius; // Big Pulsing Head
            if (dist === 1) return 10;
            if (dist === 2) return 8;
            if (dist === 3) return 6;
            if (dist === 4) return 4;
            return 0; // Hidden
        };

        const getPointColor = (ctx, color) => {
            return color;
        };

        // White Border for Contrast
        const getPointBorderColor = (ctx) => {
            const index = ctx.dataIndex;
            const count = ctx.dataset.data.length;
            const dist = count - 1 - index;
            if (dist < 5) return 'rgba(255, 255, 255, 0.9)'; // Strong White Border
            return 'transparent';
        };

        const getPointBorderWidth = (ctx) => {
            const index = ctx.dataIndex;
            const count = ctx.dataset.data.length;
            const dist = count - 1 - index;
            if (dist < 5) return 3; // Fixed border width
            return 0;
        };

        return {
            datasets: [
                {
                    label: 'Lying',
                    data: cowData.map(d => ({ x: d.timestamp, y: d.pct_lying * 100 })),
                    borderColor: 'rgb(53, 162, 235)',
                    backgroundColor: 'rgba(53, 162, 235, 0.2)',
                    fill: 'origin',
                    tension: 0.1,
                    yAxisID: 'y',
                    pointRadius: (ctx) => getPointRadius(ctx),
                    pointBackgroundColor: (ctx) => getPointColor(ctx, 'rgb(53, 162, 235)'),
                    pointBorderColor: (ctx) => getPointBorderColor(ctx),
                    pointBorderWidth: (ctx) => getPointBorderWidth(ctx),
                },
                {
                    label: 'Standing',
                    data: cowData.map(d => ({ x: d.timestamp, y: d.pct_standing * 100 })),
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    fill: '-1',
                    tension: 0.1,
                    yAxisID: 'y',
                    pointRadius: (ctx) => getPointRadius(ctx),
                    pointBackgroundColor: (ctx) => getPointColor(ctx, 'rgb(75, 192, 192)'),
                    pointBorderColor: (ctx) => getPointBorderColor(ctx),
                    pointBorderWidth: (ctx) => getPointBorderWidth(ctx),
                },
                {
                    label: 'Walking',
                    data: cowData.map(d => ({ x: d.timestamp, y: d.pct_walking * 100 })),
                    borderColor: 'rgb(255, 205, 86)',
                    backgroundColor: 'rgba(255, 205, 86, 0.2)',
                    fill: '-1',
                    tension: 0.1,
                    yAxisID: 'y',
                    pointRadius: (ctx) => getPointRadius(ctx),
                    pointBackgroundColor: (ctx) => getPointColor(ctx, 'rgb(255, 205, 86)'),
                    pointBorderColor: (ctx) => getPointBorderColor(ctx),
                    pointBorderWidth: (ctx) => getPointBorderWidth(ctx),
                },
                {
                    label: 'Eating',
                    data: cowData.map(d => ({ x: d.timestamp, y: d.pct_eating * 100 })),
                    borderColor: 'rgb(255, 159, 64)',
                    backgroundColor: 'rgba(255, 159, 64, 0.2)',
                    fill: '-1',
                    tension: 0.1,
                    yAxisID: 'y',
                    pointRadius: (ctx) => getPointRadius(ctx),
                    pointBackgroundColor: (ctx) => getPointColor(ctx, 'rgb(255, 159, 64)'),
                    pointBorderColor: (ctx) => getPointBorderColor(ctx),
                    pointBorderWidth: (ctx) => getPointBorderWidth(ctx),
                },
                {
                    label: 'Rumination Level',
                    data: cowData.map(d => ({ x: d.timestamp, y: d.rumination_level })),
                    borderColor: 'rgb(220, 38, 38)',
                    backgroundColor: 'rgba(220, 38, 38, 0.8)',
                    borderWidth: 2,
                    pointRadius: (ctx) => getPointRadius(ctx),
                    pointBackgroundColor: (ctx) => getPointColor(ctx, 'rgb(220, 38, 38)'),
                    pointBorderColor: (ctx) => getPointBorderColor(ctx),
                    pointBorderWidth: (ctx) => getPointBorderWidth(ctx),
                    fill: false,
                    yAxisID: 'y1',
                    type: 'line'
                }
            ]
        };
    }, [liveData, currentCow]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            title: {
                display: true,
                text: `Behavior & Nutrition - ${currentCow}`,
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += context.parsed.y.toFixed(2);
                            if (context.dataset.yAxisID === 'y') label += '%';
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: zoomLevel <= 2 ? 'minute' : 'hour',
                    displayFormats: {
                        hour: 'HH:mm',
                        minute: 'HH:mm'
                    }
                },
                // Dynamic min based on zoom level
                min: currentTime ? new Date(currentTime.getTime() - zoomLevel * 60 * 60 * 1000).toISOString() : undefined,
                title: {
                    display: true,
                    text: 'Time'
                }
            },
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: {
                    display: true,
                    text: 'Behavior %'
                },
                stacked: true,
                max: 100
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                title: {
                    display: true,
                    text: 'Rumination Level'
                },
                grid: {
                    drawOnChartArea: false,
                },
            },
        },
        animation: {
            duration: 0 // Disable animation for smooth streaming updates
        }
    };

    if (loading) return <div className="p-10 text-center">Loading Data...</div>;

    return (
        <div className="h-full flex flex-col p-4 space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-slate-800">Daily Budget (Time Allocation)</h2>

                    {/* Mode Indicator */}
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full animate-pulse ${mode === 'LIVE' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        <span className={`w-2 h-2 rounded-full ${mode === 'LIVE' ? 'bg-red-600' : 'bg-blue-600'}`}></span>
                        <span className="text-xs font-bold">{mode === 'LIVE' ? 'LIVE TRACKING' : 'REPLAY MODE'}</span>
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
                                resetSimulation(); // Force reset to start
                            }}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${mode === 'REPLAY' && historyHours === 24 ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:bg-slate-200'}`}
                        >
                            REPLAY 24H
                        </button>
                        <button
                            onClick={() => {
                                setMode('REPLAY');
                                setHistoryHours(48);
                                setReplaySpeed(60);
                                resetSimulation(); // Force reset to start
                            }}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${mode === 'REPLAY' && historyHours === 48 ? 'bg-white shadow text-purple-600' : 'text-slate-500 hover:bg-slate-200'}`}
                        >
                            REPLAY 48H
                        </button>
                    </div>

                    <div className="w-px h-6 bg-slate-200 mx-2"></div>

                    <select
                        value={currentCow}
                        onChange={(e) => onSelectCow && onSelectCow(e.target.value)}
                        className="p-2 border rounded-md bg-white shadow-sm text-sm"
                    >
                        {cows.map(id => <option key={id} value={id}>{id}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 p-4 relative">
                {chartData && <Line options={options} data={chartData} />}
            </div>
        </div>
    );
}
