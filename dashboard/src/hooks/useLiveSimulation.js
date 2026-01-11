import { useState, useEffect, useRef, useMemo } from 'react';

/**
 * Hook to simulate live data streaming.
 * @param {Array} inputData - The source dataset (assumed ~24h).
 * @param {boolean} isLive - If true, syncs to wall-clock time.
 * @param {number} replaySpeed - Multiplier for replay mode (e.g. 60 = 1h/sec).
 * @param {number} historyHours - 24 or 48. If 48, duplicates data to simulate previous day.
 */
export function useLiveSimulation(inputData, isLive = false, replaySpeed = 60, historyHours = 24) {
    const [currentData, setCurrentData] = useState([]);
    const [currentTime, setCurrentTime] = useState(null);
    const [progress, setProgress] = useState(0);

    const timeRef = useRef(null);
    const startTimeRef = useRef(null);
    const endTimeRef = useRef(null);

    // 1. Prepare Data (Handle 48h extension)
    const fullData = useMemo(() => {
        if (!inputData || inputData.length === 0) return [];

        // Sort original
        const sorted = [...inputData].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        if (historyHours <= 24) return sorted;

        // Create 48h version: Duplicate data shifted back 24h
        const shifted = sorted.map(d => ({
            ...d,
            timestamp: new Date(new Date(d.timestamp).getTime() - 24 * 60 * 60 * 1000).toISOString()
        }));

        return [...shifted, ...sorted];
    }, [inputData, historyHours]);

    // 2. Initialize Range
    useEffect(() => {
        if (fullData.length > 0) {
            const timestamps = fullData.map(d => new Date(d.timestamp).getTime());
            startTimeRef.current = Math.min(...timestamps);
            endTimeRef.current = Math.max(...timestamps);

            // Initial time set
            if (!timeRef.current) {
                timeRef.current = startTimeRef.current;
            }
        }
    }, [fullData]);

    // 3. Timer Loop
    useEffect(() => {
        if (!fullData.length || !startTimeRef.current || !endTimeRef.current) return;

        const intervalMs = 100; // Tick rate

        const timer = setInterval(() => {
            let now = timeRef.current;

            if (isLive) {
                // --- LIVE MODE: Sync to Wall Clock ---
                // Map current real time (HH:MM:SS) to the dataset's last day
                const realNow = new Date();
                const datasetBaseDate = new Date(endTimeRef.current); // Assume end of data is "today"

                // Set target time to dataset's date but real time's hours/mins
                const targetTime = new Date(datasetBaseDate);
                targetTime.setHours(realNow.getHours(), realNow.getMinutes(), realNow.getSeconds());

                // If target is beyond end, wrap to start (or just clamp)
                // Actually, if dataset is 08:00 to 08:00, and it's 09:00 real time, we want 09:00 on the dataset.
                // Let's just use the timestamp directly if we assume dataset covers the day.

                // Better approach for this specific dataset (Nov 30 - Dec 1):
                // Just take the progress of the current day.
                now = targetTime.getTime();

                // If "now" is outside range (e.g. dataset ends at 8am, real time is 5pm), 
                // we might need to wrap to the previous day in the dataset.
                if (now > endTimeRef.current) now -= 24 * 60 * 60 * 1000;
                if (now < startTimeRef.current) now += 24 * 60 * 60 * 1000;

                timeRef.current = now;

            } else {
                // --- REPLAY MODE: Fast Forward ---
                const msPerTick = (replaySpeed / 10) * 60 * 1000; // speed * 100ms
                now += msPerTick;

                // Loop
                if (now >= endTimeRef.current) {
                    now = startTimeRef.current;
                }
                timeRef.current = now;
            }

            setCurrentTime(new Date(now));

            // Progress
            const total = endTimeRef.current - startTimeRef.current;
            const elapsed = now - startTimeRef.current;
            setProgress(Math.min(100, Math.max(0, (elapsed / total) * 100)));

            // Slice Data
            // Performance: For 48h data (~5k points), filter is okay.
            let sliced = fullData.filter(d => new Date(d.timestamp).getTime() <= now);

            // Add Sensor Noise (Live Mode Only)
            if (isLive && sliced.length > 0) {
                // Clone the last point to avoid mutating original data
                const lastPoint = { ...sliced[sliced.length - 1] };

                // Add tiny random noise (+/- 0.5%)
                const noise = () => (Math.random() - 0.5) * 0.01;

                lastPoint.pct_lying = Math.max(0, Math.min(1, lastPoint.pct_lying + noise()));
                lastPoint.pct_standing = Math.max(0, Math.min(1, lastPoint.pct_standing + noise()));
                lastPoint.pct_walking = Math.max(0, Math.min(1, lastPoint.pct_walking + noise()));
                lastPoint.pct_eating = Math.max(0, Math.min(1, lastPoint.pct_eating + noise()));

                // Add noise to Health Metrics
                if (lastPoint.neck_temp_c) lastPoint.neck_temp_c += (Math.random() - 0.5) * 0.1; // +/- 0.05 C
                if (lastPoint.activity_index) lastPoint.activity_index += (Math.random() - 0.5) * 2; // +/- 1 unit

                // Add noise to Environment/GPS
                if (lastPoint.heat_index) lastPoint.heat_index += (Math.random() - 0.5) * 0.5;
                if (lastPoint.gps_lat) lastPoint.gps_lat += (Math.random() - 0.5) * 0.0001; // Tiny jitter
                if (lastPoint.gps_long) lastPoint.gps_long += (Math.random() - 0.5) * 0.0001;

                // Replace last point in the slice
                sliced = [...sliced.slice(0, -1), lastPoint];
            }

            setCurrentData(sliced);

        }, intervalMs);

        return () => clearInterval(timer);
    }, [fullData, isLive, replaySpeed]);

    const resetSimulation = () => {
        if (startTimeRef.current) {
            timeRef.current = startTimeRef.current;
            setCurrentTime(new Date(startTimeRef.current));
            setCurrentData([]); // Clear data visually to look "new"
        }
    };

    return {
        liveData: currentData,
        currentTime,
        progress,
        resetSimulation
    };
}
