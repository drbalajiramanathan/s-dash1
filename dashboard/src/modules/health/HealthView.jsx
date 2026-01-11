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
    TimeScale,
    BarElement
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    TimeScale
);

export default function HealthView({ selectedCow, onSelectCow }) {
    const { data, cows, loading } = useCowData();

    // Simulation State
    const [mode, setMode] = useState('LIVE'); // 'LIVE' | 'REPLAY'
    const [historyHours, setHistoryHours] = useState(24);
    const [replaySpeed, setReplaySpeed] = useState(60); // 1 hour per second
    const [zoomLevel, setZoomLevel] = useState(10 / 60); // Default to 10m for LIVE

    const { liveData, currentTime, resetSimulation } = useLiveSimulation(data, mode === 'LIVE', replaySpeed, historyHours);

    const currentCow = selectedCow || (cows.length > 0 ? cows[0] : 'COW_01');

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
        cowData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // MOCK ESTRUS: If COW_01, add fake estrus alerts between 14:00 and 18:00
        const mockData = cowData.map(d => {
            const h = new Date(d.timestamp).getHours();
            const isMockEstrus = currentCow === 'COW_01' && h >= 14 && h <= 18;
            return {
                ...d,
                label_estrus: d.label_estrus || (isMockEstrus ? 1 : 0)
            };
        });

        // Pulsation Logic
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
                    type: 'line',
                    label: 'Neck Temperature (°C)',
                    data: mockData.map(d => ({ x: d.timestamp, y: d.neck_temp_c })),
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    yAxisID: 'y',
                    tension: 0.4,
                    pointRadius: (ctx) => getPointRadius(ctx),
                    pointBackgroundColor: (ctx) => getPointColor(ctx, 'rgb(255, 99, 132)'),
                    pointBorderColor: (ctx) => getPointBorderColor(ctx),
                    pointBorderWidth: (ctx) => getPointBorderWidth(ctx),
                },
                {
                    type: 'line',
                    label: 'Activity Index (ODBA)',
                    data: mockData.map(d => ({ x: d.timestamp, y: d.activity_index })),
                    borderColor: 'rgb(54, 162, 235)',
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    yAxisID: 'y1',
                    tension: 0.4,
                    pointRadius: (ctx) => getPointRadius(ctx),
                    pointBackgroundColor: (ctx) => getPointColor(ctx, 'rgb(54, 162, 235)'),
                    pointBorderColor: (ctx) => getPointBorderColor(ctx),
                    pointBorderWidth: (ctx) => getPointBorderWidth(ctx),
                },
                {
                    type: 'bar',
                    label: 'Estrus Alert',
                    data: mockData.map(d => ({
                        x: d.timestamp,
                        y: d.label_estrus ? 1 : 0
                    })),
                    backgroundColor: '#fc9ac3', // User requested specific shade
                    borderColor: '#fc9ac3',
                    borderWidth: 1,
                    yAxisID: 'yEstrus',
                    barThickness: 'flex',
                    categoryPercentage: 1.0,
                    barPercentage: 1.0
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
                text: `Health & Reproduction - ${currentCow}`,
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            if (context.dataset.yAxisID === 'yEstrus') {
                                label += context.parsed.y === 1 ? 'High Alert' : 'Normal';
                            } else {
                                label += context.parsed.y.toFixed(2);
                            }
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
                    text: 'Temperature (°C)'
                },
                min: 35,
                max: 42
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                title: {
                    display: true,
                    text: 'Activity Index'
                },
                grid: {
                    drawOnChartArea: false,
                },
                min: 0,
                max: 500
            },
            yEstrus: {
                type: 'linear',
                display: false, // Hidden axis for bars
                min: 0,
                max: 1.5
            }
        },
        animation: {
            duration: 0
        }
    };

    if (loading) return <div className="p-10 text-center">Loading Data...</div>;

    return (
        <div className="h-full flex flex-col p-4 space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-slate-800">Health & Reproduction Monitoring</h2>

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
                                resetSimulation();
                            }}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${mode === 'REPLAY' && historyHours === 24 ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:bg-slate-200'}`}
                        >
                            REPLAY 24H
                        </button>
                        <button
                            onClick={() => {
                                setMode('REPLAY');
                                setHistoryHours(48);
                                setReplaySpeed(120);
                                resetSimulation();
                            }}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${mode === 'REPLAY' && historyHours === 48 ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:bg-slate-200'}`}
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

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-4 relative">
                {chartData ? <Chart type='line' data={chartData} options={options} /> : <div className="flex items-center justify-center h-full text-slate-400">Waiting for data...</div>}
            </div>
        </div>
    );
}
