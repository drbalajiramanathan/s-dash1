import { useState, useEffect } from 'react';
import Papa from 'papaparse';

const DATA_PATH = import.meta.env.BASE_URL + 'data/cattle_dashboard_5cows_varied_health.csv';

export function useCowData() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cows, setCows] = useState([]);

    useEffect(() => {
        Papa.parse(DATA_PATH, {
            download: true,
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                const rawData = results.data;
                setData(rawData);

                // Extract unique cows
                const uniqueCows = [...new Set(rawData.map(r => r.cow_id))].filter(Boolean).sort();
                setCows(uniqueCows);

                setLoading(false);
            },
            error: (err) => {
                setError(err);
                setLoading(false);
            }
        });
    }, []);

    return { data, cows, loading, error };
}
