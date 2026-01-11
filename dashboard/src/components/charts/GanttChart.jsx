import React, { useEffect, useRef } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    TimeScale
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    TimeScale
);

// State Mapping
const STATE_LABELS = {
    0: 'Lying',
    1: 'Standing',
    2: 'Eating'
};

// Pastel Colors
const STATE_COLORS = {
    0: 'rgba(147, 197, 253, 0.9)',  // Blue 300
    1: 'rgba(134, 239, 172, 0.9)',   // Green 300
    2: 'rgba(253, 186, 116, 0.9)'    // Orange 300
};

export default function GanttChart({ dataPoints, onBarClick, viewMode = 'single', timeRange = 24, minTime, maxTime, animationDuration = 0 }) {
    const chartRef = useRef(null);

    const chartData = React.useMemo(() => {
        if (!Array.isArray(dataPoints) || dataPoints.length === 0) return null;

        const blocks = [];
        // Sort by animalId then timestamp
        const sortedData = [...dataPoints].sort((a, b) => {
            if (a.animalId < b.animalId) return -1;
            if (a.animalId > b.animalId) return 1;
            return a.timestamp - b.timestamp;
        });

        if (sortedData.length > 0) {
            let currentBlock = {
                state: sortedData[0].state,
                start: sortedData[0].timestamp,
                end: sortedData[0].timestamp,
                animalId: sortedData[0].animalId
            };

            for (let i = 1; i < sortedData.length; i++) {
                const point = sortedData[i];
                // Break block if state changes OR animal changes
                if (point.state !== currentBlock.state || point.animalId !== currentBlock.animalId) {
                    blocks.push(currentBlock);
                    currentBlock = {
                        state: point.state,
                        start: point.timestamp,
                        end: point.timestamp,
                        animalId: point.animalId
                    };
                } else {
                    currentBlock.end = point.timestamp;
                }
            }
            blocks.push(currentBlock);
        }

        const calculatedMin = blocks.length > 0 ? blocks[0].start : null;
        const calculatedMax = blocks.length > 0 ? blocks[blocks.length - 1].end : null;

        const isAll = viewMode === 'all';

        // Extract unique Y-axis labels
        const yLabels = isAll
            ? [...new Set(blocks.map(b => b.animalId))].sort((a, b) => a - b)
            : ['Lying', 'Standing', 'Eating'];

        return {
            min: calculatedMin,
            max: calculatedMax,
            yLabels: yLabels,
            data: {
                labels: yLabels, // Explicitly set labels for the Y-axis
                datasets: [
                    {
                        label: 'Lying',
                        data: blocks.filter(b => b.state === 0).map(b => ({
                            x: [b.start, b.end],
                            y: isAll ? b.animalId : 'Lying'
                        })),
                        backgroundColor: STATE_COLORS[0],
                        barPercentage: 0.8,
                        categoryPercentage: 0.9
                    },
                    {
                        label: 'Standing',
                        data: blocks.filter(b => b.state === 1).map(b => ({
                            x: [b.start, b.end],
                            y: isAll ? b.animalId : 'Standing'
                        })),
                        backgroundColor: STATE_COLORS[1],
                        barPercentage: 0.8,
                        categoryPercentage: 0.9
                    },
                    {
                        label: 'Eating',
                        data: blocks.filter(b => b.state === 2).map(b => ({
                            x: [b.start, b.end],
                            y: isAll ? b.animalId : 'Eating'
                        })),
                        backgroundColor: STATE_COLORS[2],
                        barPercentage: 0.8,
                        categoryPercentage: 0.9
                    }
                ]
            }
        };
    }, [dataPoints, viewMode]);

    const options = React.useMemo(() => ({
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                type: 'time',
                // Use explicit min/max if provided, otherwise fallback to calculated or timeRange logic
                min: minTime || chartData?.min,
                max: maxTime || (timeRange ? ((minTime || chartData?.min) + timeRange * 60 * 60 * 1000) : chartData?.max),
                time: {
                    unit: timeRange <= 1 ? 'minute' : 'hour',
                    displayFormats: {
                        minute: 'HH:mm',
                        hour: 'HH:mm'
                    }
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                    color: '#64748b'
                }
            },
            y: {
                type: 'category',
                labels: chartData?.yLabels, // Explicitly use calculated labels
                grid: {
                    display: false
                },
                ticks: {
                    color: '#334155',
                    font: {
                        size: 11,
                        weight: 'bold'
                    },
                    autoSkip: false // Ensure all animals are shown
                },
                stacked: true
            }
        },
        plugins: {
            legend: {
                display: false,
                labels: { color: '#475569' }
            },
            tooltip: {
                callbacks: {
                    title: (ctx) => {
                        // Show Animal ID in title for 'all' mode
                        return viewMode === 'all' ? `Animal: ${ctx[0].raw.y}` : '';
                    },
                    label: (ctx) => {
                        const start = new Date(ctx.raw.x[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const end = new Date(ctx.raw.x[1]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        return `${ctx.dataset.label}: ${start} - ${end}`;
                    }
                }
            }
        },
        animation: {
            duration: animationDuration
        },
        onClick: (event, elements, chart) => {
            if (elements.length > 0) {
                const index = elements[0].index;
                const datasetIndex = elements[0].datasetIndex;
                const dataPoint = chart.data.datasets[datasetIndex].data[index];

                // Correctly identify the clicked animal
                const clickedId = viewMode === 'all' ? dataPoint.y : null;

                if (onBarClick) {
                    onBarClick(clickedId); // Pass the ID directly
                }
            }
        }
    }), [onBarClick, chartData, viewMode, timeRange, minTime, maxTime, animationDuration]);

    if (!Array.isArray(dataPoints) || dataPoints.length === 0 || !chartData) {
        return <div className="flex items-center justify-center h-full text-slate-500">Waiting for data...</div>;
    }

    return (
        <div className="h-full w-full p-4">
            <Bar
                ref={chartRef}
                data={chartData.data}
                options={options}
                datasetIdKey='label'
            />
        </div>
    );
}
