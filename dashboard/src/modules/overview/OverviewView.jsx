import React, { useState, useMemo } from 'react';
import { useCowData } from '../../hooks/useCowData';
import { useLiveSimulation } from '../../hooks/useLiveSimulation';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    Title
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { AlertTriangle, Battery, BatteryCharging, CheckCircle } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function OverviewView() {
    const { data, cows, loading } = useCowData();

    // Simulation State (Auto-play by default for Overview)
    const [mode, setMode] = useState('LIVE');
    const [replaySpeed, setReplaySpeed] = useState(60);
    const [historyHours, setHistoryHours] = useState(24);

    const { liveData, currentTime } = useLiveSimulation(data, mode === 'LIVE', replaySpeed, historyHours);

    // Get latest data for each cow based on Simulation Time
    const latestData = useMemo(() => {
        if (!liveData || !liveData.length) return [];

        // We need the "latest" point for each cow up to currentTime
        const latest = {};
        // liveData is already sliced to currentTime, so we just need the last entry for each cow
        // But liveData is a flat list. Let's iterate.
        liveData.forEach(d => {
            if (!latest[d.cow_id] || new Date(d.timestamp) > new Date(latest[d.cow_id].timestamp)) {
                latest[d.cow_id] = d;
            }
        });
        return Object.values(latest);
    }, [liveData]);

    // Donut Data: Aggregate current state
    const donutData = useMemo(() => {
        let lying = 0, standing = 0, walking = 0, eating = 0;
        latestData.forEach(d => {
            // Assuming the state with highest pct is the current state
            const max = Math.max(d.pct_lying, d.pct_standing, d.pct_walking, d.pct_eating);
            if (max === d.pct_lying) lying++;
            else if (max === d.pct_standing) standing++;
            else if (max === d.pct_walking) walking++;
            else if (max === d.pct_eating) eating++;
        });

        return {
            labels: ['Lying', 'Standing', 'Walking', 'Eating'],
            datasets: [
                {
                    data: [lying, standing, walking, eating],
                    backgroundColor: [
                        'rgba(53, 162, 235, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(255, 205, 86, 0.8)',
                        'rgba(255, 159, 64, 0.8)',
                    ],
                    borderWidth: 1,
                },
            ],
        };
    }, [latestData]);

    // Battery Data
    const batteryData = useMemo(() => {
        return {
            labels: latestData.map(d => d.cow_id),
            datasets: [{
                label: 'Battery Voltage (V)',
                data: latestData.map(d => d.battery_v),
                backgroundColor: latestData.map(d => d.battery_v < 3.6 ? 'rgba(255, 99, 132, 0.8)' : 'rgba(75, 192, 192, 0.8)')
            }]
        };
    }, [latestData]);

    // Alerts
    const alerts = useMemo(() => {
        const activeAlerts = [];
        latestData.forEach(d => {
            if (d.label_estrus) activeAlerts.push({ id: d.cow_id, type: 'Estrus', time: d.timestamp });
        });
        return activeAlerts;
    }, [latestData]);

    if (loading) return <div className="p-10 text-center">Loading Data...</div>;

    return (
        <div className="h-full flex flex-col p-4 space-y-4 overflow-y-auto">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">Herd Overview</h2>

                {/* Live Indicator */}
                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full animate-pulse ${mode === 'LIVE' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        <span className={`w-2 h-2 rounded-full ${mode === 'LIVE' ? 'bg-red-600' : 'bg-blue-600'}`}></span>
                        <span className="text-xs font-bold">LIVE MONITOR</span>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">
                        {currentTime ? currentTime.toLocaleTimeString() : '--:--:--'}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Herd Status */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-500 mb-4">Current Herd Status</h3>
                    <div className="h-64 flex justify-center">
                        <Doughnut data={donutData} options={{ maintainAspectRatio: false, animation: { duration: 500 } }} />
                    </div>
                </div>

                {/* Battery Health */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-500 mb-4">Sensor Battery Health</h3>
                    <div className="h-64">
                        <Bar
                            data={batteryData}
                            options={{
                                maintainAspectRatio: false,
                                animation: { duration: 500 },
                                scales: { y: { min: 3.0, max: 4.5 } },
                                plugins: { legend: { display: false } }
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Alert List */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex-1">
                <h3 className="text-sm font-bold text-slate-500 mb-4">Active Alerts</h3>
                <div className="space-y-2">
                    {alerts.length === 0 ? (
                        <div className="flex items-center gap-2 text-green-600 p-2 bg-green-50 rounded-lg">
                            <CheckCircle size={18} />
                            <span className="text-sm font-medium">No active alerts. Herd is healthy.</span>
                        </div>
                    ) : (
                        alerts.map((alert, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="text-red-500 animate-bounce" size={20} />
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{alert.type} Detected</p>
                                        <p className="text-xs text-slate-500">Cow ID: {alert.id}</p>
                                    </div>
                                </div>
                                <span className="text-xs font-mono text-slate-400">{new Date(alert.time).toLocaleTimeString()}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
