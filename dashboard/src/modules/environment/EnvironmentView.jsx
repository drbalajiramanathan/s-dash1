import React, { useState, useMemo } from 'react';
import { useCowData } from '../../hooks/useCowData';
import { useLiveSimulation } from '../../hooks/useLiveSimulation';
import {
    Chart as ChartJS,
    LinearScale,
    PointElement,
    Tooltip,
    Legend,
    Title
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend, Title);

export default function EnvironmentView({ selectedCow, onSelectCow }) {
    const { data, cows, loading } = useCowData();

    // Simulation State
    const [mode, setMode] = useState('LIVE'); // 'LIVE' | 'REPLAY'
    const [historyHours, setHistoryHours] = useState(24);
    const [replaySpeed, setReplaySpeed] = useState(60);
    const [zoomLevel, setZoomLevel] = useState(10 / 60); // Default to 10m trail

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
            setZoomLevel(10 / 60);
        } else {
            setZoomLevel(historyHours === 48 ? 48 : 12);
        }
    }, [mode, historyHours]);

    const chartData = useMemo(() => {
        if (!liveData || !liveData.length) return null;

        // Sort full data once
        const sortedData = [...liveData].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const nowMs = currentTime ? currentTime.getTime() : Date.now();
        const trailDurationMs = zoomLevel * 60 * 60 * 1000;

        // Pulsation Logic
        const pulseRadius = Math.abs(Math.sin(Date.now() / 200)) * 5 + 10;

        // Generate a dataset for EACH cow
        const datasets = cows.map(cowId => {
            const isSelected = cowId === currentCow;

            // Filter data for this cow and time window
            const cowPoints = sortedData.filter(d => {
                if (d.cow_id !== cowId) return false;
                const t = new Date(d.timestamp).getTime();
                return t >= nowMs - trailDurationMs && t <= nowMs;
            });

            return {
                label: cowId,
                data: cowPoints.map(d => ({ x: d.gps_long, y: d.gps_lat, v: d.heat_index })),
                // Visuals
                pointBackgroundColor: (ctx) => {
                    const val = ctx.raw?.v;
                    if (val === undefined) return 'rgba(0,0,0,0)';

                    // Base Color
                    let color;
                    if (val < 72) color = '75, 192, 192'; // Green
                    else if (val < 78) color = '255, 205, 86'; // Yellow
                    else color = '255, 99, 132'; // Red

                    // Opacity: 0.9 for selected, 0.25 for others
                    const alpha = isSelected ? 0.9 : 0.25;
                    return `rgba(${color}, ${alpha})`;
                },
                pointRadius: (ctx) => {
                    const index = ctx.dataIndex;
                    const count = ctx.dataset.data.length;
                    const dist = count - 1 - index; // 0 is head

                    if (dist === 0) return isSelected ? pulseRadius : 8;

                    if (dist < 5) return 10 - (dist * 1.5);
                    return 3;
                },
                pointBorderColor: (ctx) => {
                    const index = ctx.dataIndex;
                    const count = ctx.dataset.data.length;
                    const dist = count - 1 - index;
                    if (dist === 0) return `rgba(255, 255, 255, ${isSelected ? 1 : 0.5})`;
                    return 'transparent';
                },
                pointBorderWidth: (ctx) => {
                    const index = ctx.dataIndex;
                    const count = ctx.dataset.data.length;
                    const dist = count - 1 - index;
                    return dist === 0 ? 2 : 0;
                },
                pointHoverRadius: 15,
                // Custom property for the label plugin
                cowId: cowId,
                isSelected: isSelected
            };
        });

        return { datasets };
    }, [liveData, cows, currentCow, zoomLevel, currentTime]);

    // Helper: Point in Polygon (Ray Casting)
    const isPointInPolygon = (point, vs) => {
        // point = [x, y], vs = [[x, y], ...]
        const x = point[0], y = point[1];
        let inside = false;
        for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            const xi = vs[i][0], yi = vs[i][1];
            const xj = vs[j][0], yj = vs[j][1];
            const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    };

    // Custom Plugin to draw Farm Map (Background)
    const farmMapPlugin = {
        id: 'farmMap',
        beforeDatasetsDraw(chart) {
            const { ctx, scales: { x, y } } = chart;

            // Helper to draw polygon from GPS coords
            const drawZone = (coords, color, strokeColor, label) => {
                ctx.save();
                ctx.beginPath();
                coords.forEach((pt, i) => {
                    const xPos = x.getPixelForValue(pt[0]);
                    const yPos = y.getPixelForValue(pt[1]);
                    if (i === 0) ctx.moveTo(xPos, yPos);
                    else ctx.lineTo(xPos, yPos);
                });
                ctx.closePath();

                if (color) {
                    ctx.fillStyle = color;
                    ctx.fill();
                }

                if (strokeColor) {
                    ctx.strokeStyle = strokeColor;
                    ctx.lineWidth = 2;
                    if (label === 'Virtual Fence') ctx.setLineDash([5, 5]); // Dashed for fence
                    ctx.stroke();
                }

                // Label
                if (label) {
                    // Find center (rough)
                    const centerX = coords.reduce((sum, pt) => sum + x.getPixelForValue(pt[0]), 0) / coords.length;
                    const centerY = coords.reduce((sum, pt) => sum + y.getPixelForValue(pt[1]), 0) / coords.length;

                    ctx.fillStyle = strokeColor || 'rgba(100, 116, 139, 0.8)';
                    ctx.font = 'bold 10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(label, centerX, centerY);
                }
                ctx.restore();
            };

            // 1. Farm Boundary (Virtual Fence) - Irregular Polygon
            const farmBoundary = [
                [-81.3045, 43.0485], // Top Left
                [-81.2980, 43.0485], // Top Right (Panhandle start)
                [-81.2980, 43.0460], // Notch in
                [-81.2960, 43.0460], // Panhandle end
                [-81.2960, 43.0420], // Bottom Right
                [-81.3000, 43.0415], // Bottom Curve
                [-81.3030, 43.0425], // Bottom Left
                [-81.3045, 43.0450]  // Mid Left
            ];
            // Subtle Green/Brown fill, White Dashed Fence
            drawZone(farmBoundary, 'rgba(236, 253, 245, 0.4)', 'rgba(16, 185, 129, 0.4)', 'Virtual Fence');

            // 2. Barn Area - Rectangle near top
            const barnArea = [
                [-81.302, 43.0475],
                [-81.300, 43.0475],
                [-81.300, 43.0465],
                [-81.302, 43.0465]
            ];
            // Grey/Wood color
            drawZone(barnArea, 'rgba(241, 245, 249, 0.6)', 'rgba(148, 163, 184, 0.6)', 'BARN');

            // 3. Drinking Area - Small zone near barn
            const waterArea = [
                [-81.3015, 43.0460],
                [-81.3005, 43.0460],
                [-81.3005, 43.0455],
                [-81.3015, 43.0455]
            ];
            // Blue
            drawZone(waterArea, 'rgba(219, 234, 254, 0.6)', 'rgba(59, 130, 246, 0.5)', 'WATER');
        }
    };

    // Custom Plugin to draw "Button Labels" & Alerts
    const cowLabelPlugin = {
        id: 'cowLabels',
        afterDatasetsDraw(chart) {
            const { ctx } = chart;

            // Define boundary again for check (must match above)
            const farmBoundary = [
                [-81.3045, 43.0485], [-81.2980, 43.0485], [-81.2980, 43.0460],
                [-81.2960, 43.0460], [-81.2960, 43.0420], [-81.3000, 43.0415],
                [-81.3030, 43.0425], [-81.3045, 43.0450]
            ];

            chart.data.datasets.forEach((dataset, i) => {
                const meta = chart.getDatasetMeta(i);
                if (!meta.hidden && meta.data.length > 0) {
                    // Get the last point (the head)
                    const lastPoint = meta.data[meta.data.length - 1];
                    const { x, y } = lastPoint.getProps(['x', 'y'], true);

                    // Get raw GPS coords from dataset
                    const rawData = dataset.data[dataset.data.length - 1];
                    const gpsPoint = [rawData.x, rawData.y];

                    const isSelected = dataset.isSelected;
                    const text = dataset.cowId;

                    // Check Bounds
                    const isInside = isPointInPolygon(gpsPoint, farmBoundary);
                    const isOutOfBounds = !isInside;

                    // Style
                    ctx.save();
                    ctx.font = isSelected ? 'bold 12px sans-serif' : '11px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    // Button Dimensions
                    const paddingX = 8;
                    const paddingY = 4;
                    const metrics = ctx.measureText(text);
                    const width = metrics.width + paddingX * 2;
                    const height = 20;

                    // Position: Above the dot
                    const boxX = x - width / 2;
                    const boxY = y - 25; // Shift up

                    // Shadow (Popout effect)
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                    ctx.shadowBlur = 4;
                    ctx.shadowOffsetY = 2;

                    // Button Background
                    const alpha = isSelected ? 1.0 : 0.25;

                    // Button Color
                    // If Out of Bounds -> RED and Flash
                    let fillStyle = `rgba(59, 130, 246, ${alpha})`; // Default Blue

                    if (isOutOfBounds) {
                        // Flash effect
                        const flash = Math.floor(Date.now() / 500) % 2 === 0;
                        fillStyle = flash ? `rgba(239, 68, 68, ${alpha})` : `rgba(185, 28, 28, ${alpha})`; // Red-500 / Red-700
                    }

                    ctx.fillStyle = fillStyle;

                    // Draw Rounded Rect
                    const r = 4;
                    ctx.beginPath();
                    ctx.roundRect(boxX, boxY, width, height, r);
                    ctx.fill();

                    // Text Color (White)
                    ctx.shadowColor = 'transparent'; // No shadow for text
                    ctx.fillStyle = `rgba(255, 255, 255, ${isSelected ? 1 : 0.8})`;
                    ctx.fillText(text, x, boxY + height / 2);

                    // ALERT TEXT (Popout)
                    if (isOutOfBounds) {
                        ctx.font = 'bold 10px sans-serif';
                        ctx.fillStyle = 'rgba(220, 38, 38, 1)'; // Red text
                        ctx.fillText("OUT OF BOUNDS", x, boxY - 12);
                    }

                    ctx.restore();
                }
            });
        }
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        plugins: {
            title: {
                display: true,
                text: `GPS Location & Heat Stress - Live Comparison`,
            },
            tooltip: {
                callbacks: {
                    label: (ctx) => `${ctx.dataset.label}: THI ${ctx.raw.v?.toFixed(1)}`
                }
            },
            legend: {
                display: false // We use custom labels now
            }
        },
        scales: {
            x: {
                title: { display: true, text: 'Longitude' },
                grid: { display: false },
                ticks: { display: true },
                min: -81.305,
                max: -81.295
            },
            y: {
                title: { display: true, text: 'Latitude' },
                grid: { display: false },
                ticks: { display: true },
                min: 43.040,
                max: 43.050
            }
        }
    };

    if (loading) return <div className="p-10 text-center">Loading Data...</div>;

    return (
        <div className="h-full flex flex-col p-4 space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-slate-800">Environment & Comfort</h2>

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
                    {/* Live Zoom Controls (Trail Length) */}
                    {mode === 'LIVE' && (
                        <div className="flex bg-slate-100 rounded-lg p-1 gap-1 mr-2">
                            <button
                                onClick={() => setZoomLevel(10 / 60)}
                                className={`px-2 py-1 text-xs font-bold rounded-md ${zoomLevel === 10 / 60 ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}
                            >
                                10M Trail
                            </button>
                            <button
                                onClick={() => setZoomLevel(1)}
                                className={`px-2 py-1 text-xs font-bold rounded-md ${zoomLevel === 1 ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}
                            >
                                1H Trail
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

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 p-4 relative overflow-hidden">
                {/* Background removed for clean white look */}

                <div className="relative z-10 h-full">
                    {chartData ? <Scatter options={options} data={chartData} plugins={[farmMapPlugin, cowLabelPlugin]} /> : <div className="flex items-center justify-center h-full text-slate-400">Waiting for GPS signal...</div>}
                </div>

                {/* Legend Overlay - Moved to Top Right to avoid overlap */}
                <div className="absolute top-4 right-4 bg-white/90 p-2 rounded-lg shadow-sm border border-slate-200 text-xs z-20">
                    <div className="font-bold mb-1">Heat Stress Index (THI)</div>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[rgba(75,192,192,0.9)]"></span><span>Comfort (&lt;72)</span></div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[rgba(255,205,86,0.9)]"></span><span>Mild Stress (72-78)</span></div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[rgba(255,99,132,0.9)]"></span><span>High Stress (&gt;78)</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
