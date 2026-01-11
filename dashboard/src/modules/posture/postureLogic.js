import * as ort from 'onnxruntime-web';

// Feature Extraction Logic
// Input: buffer (Array of 6 objects with AccX, AccY, AccZ, GyroX, GyroY, GyroZ)
// Output: Float32Array(13)
export function calculateFeatures(buffer) {
    if (buffer.length !== 6) {
        throw new Error("Buffer must have exactly 6 samples");
    }

    const axes = ['AccX', 'AccY', 'AccZ', 'GyroX', 'GyroY', 'GyroZ'];
    const features = [];

    // 1. Calculate Mean and Std for each axis
    axes.forEach(axis => {
        const values = buffer.map(row => row[axis]);

        // Mean
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / values.length;

        // Std Dev (Sample, N-1)
        // N=6, so divisor is 5
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        const sumSquaredDiffs = squaredDiffs.reduce((a, b) => a + b, 0);
        const std = Math.sqrt(sumSquaredDiffs / 5); // N-1 = 5

        features.push(mean);
        features.push(std);
    });

    // 2. Calculate SMA (Signal Magnitude Area)
    // SMA = 1/6 * sum(|AccX| + |AccY| + |AccZ|)
    let smaSum = 0;
    for (let i = 0; i < 6; i++) {
        const absSum = Math.abs(buffer[i].AccX) + Math.abs(buffer[i].AccY) + Math.abs(buffer[i].AccZ);
        smaSum += absSum;
    }
    const sma = smaSum / 6;
    features.push(sma);

    // Final Vector: [AccX_mean, AccX_std, ..., GyroZ_std, SMA]
    return new Float32Array(features);
}

// Inference Logic
export async function runInference(session, features) {
    try {
        // Create tensor. Shape [1, 13]
        const tensor = new ort.Tensor('float32', features, [1, 13]);

        // Run model
        // Note: We assume the input node name is 'float_input' or similar. 
        // Usually ONNX Runtime can infer, but we pass the tensor map.
        // We'll inspect the session input names dynamically to be safe.
        const inputName = session.inputNames[0];
        const feeds = { [inputName]: tensor };

        const results = await session.run(feeds);

        // Output: usually 'label' or 'probabilities'
        // For a classifier, we expect an integer label.
        const outputName = session.outputNames[0];
        const output = results[outputName];

        // Return the predicted class (0, 1, or 2)
        return Number(output.data[0]);

    } catch (e) {
        console.error("Inference Failed:", e);
        return null;
    }
}
