const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const OUTPUT_PATH = path.join(__dirname, 'public/data/multi_cow_data_24hr.csv');

// Configuration for 10 animals
const ANIMALS = Array.from({ length: 10 }, (_, i) => ({
    id: `${100 + i}`,
    profile: i < 4 ? 'normal' : i < 7 ? 'active' : 'lazy',
    meta: {
        age: 2 + Math.floor(Math.random() * 6),
        breed: i % 2 === 0 ? 'Holstein' : 'Jersey',
        color: i % 3 === 0 ? 'Black/White' : i % 3 === 1 ? 'Brown' : 'Spotted',
        image: `/images/${100 + i}.jpg`
    }
}));

// State mapping: 0=Lying, 1=Standing, 2=Eating
const STATES = { LYING: 0, STANDING: 1, EATING: 2 };

function generateDayData(animal) {
    const rows = [];
    const startTime = new Date().setHours(0, 0, 0, 0); // Start of today
    let currentTime = startTime;
    const endTime = startTime + 24 * 60 * 60 * 1000;

    let currentState = STATES.LYING; // Start lying down

    while (currentTime < endTime) {
        // Determine duration based on state and profile
        let durationMinutes = 0;
        const rand = Math.random();

        if (currentState === STATES.LYING) {
            // Lying bouts are usually long (30-120 mins)
            const base = animal.profile === 'lazy' ? 90 : animal.profile === 'active' ? 45 : 60;
            durationMinutes = base + (rand * 60) - 30;
        } else if (currentState === STATES.STANDING) {
            // Standing bouts (10-60 mins)
            const base = animal.profile === 'active' ? 45 : 20;
            durationMinutes = base + (rand * 30) - 10;
        } else {
            // Eating bouts (15-45 mins)
            const base = animal.profile === 'active' ? 40 : 25;
            durationMinutes = base + (rand * 20) - 10;
        }

        // Add noise to duration
        durationMinutes = Math.max(5, Math.floor(durationMinutes));

        // Generate rows for this bout (every 10 minutes to keep file size manageable but granular enough)
        const steps = Math.floor(durationMinutes / 10);
        for (let i = 0; i < steps; i++) {
            if (currentTime >= endTime) break;

            rows.push({
                AnimalID: animal.id,
                Timestamp: new Date(currentTime).toISOString(),
                Classification: currentState,
                Age: animal.meta.age,
                Breed: animal.meta.breed,
                Color: animal.meta.color,
                Image: animal.meta.image
            });

            currentTime += 10 * 60 * 1000; // +10 mins
        }

        // Transition logic
        if (currentState === STATES.LYING) {
            currentState = STATES.STANDING; // Always stand up after lying
        } else if (currentState === STATES.STANDING) {
            currentState = Math.random() > 0.6 ? STATES.EATING : STATES.LYING;
        } else {
            currentState = STATES.STANDING; // Stand after eating
        }
    }

    return rows;
}

const allData = [];
ANIMALS.forEach(animal => {
    console.log(`Generating data for Cow ${animal.id} (${animal.profile})...`);
    allData.push(...generateDayData(animal));
});

const csv = Papa.unparse(allData);
fs.writeFileSync(OUTPUT_PATH, csv);
console.log(`Successfully generated ${allData.length} rows to ${OUTPUT_PATH}`);
