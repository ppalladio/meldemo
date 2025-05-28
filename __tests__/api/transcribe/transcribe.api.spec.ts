import { expect, request, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Ensure __dirname works in ESM too (optional)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('direct API test for /api/v1/transcribe', async ({ baseURL }) => {
    // Absolute path relative to project root
    const audioPath = path.resolve(__dirname, '../../audio/test-audio.webm');

    if (!fs.existsSync(audioPath)) {
        throw new Error(` Test audio file does not exist at ${audioPath}`);
    }

    const fileBuffer = fs.readFileSync(audioPath);

    const context = await request.newContext();
    const response = await context.fetch(`${baseURL}/api/v1/transcribe`, {
        method: 'POST',
        multipart: {
            file: {
                name: 'test-audio.webm',
                mimeType: 'audio/webm',
                buffer: fileBuffer,
            },
        },
    });

    const status = response.status();
    const body = await response.json();

    if (status !== 200 || body?.error) {
        console.error('❌ Transcription failed');
        console.error('Status:', status);
        console.error('Body:', body);
    }

    expect(status).toBe(200);
    expect(body).not.toHaveProperty('error');
    expect(typeof body.transcription).toBe('string');
    expect(body.transcription.trim().length).toBeGreaterThan(0);
});
