// Import the default language setting for transcription responses
import { responseLanguage } from '@/lib/constant';
// axios lets us make HTTP requests to external services
import axios from 'axios';
// FormData helps build multipart/form-data requests
import FormData from 'form-data';
// fs and createReadStream allow us to work with the file system and read files
import fs, { createReadStream } from 'fs';
// Types for Next.js API request and response objects
import { NextRequest, NextResponse } from 'next/server';
// os and path help work with temporary directories and file paths
import os from 'os';
import path from 'path';

// Disable caching: always handle requests dynamically
export const dynamic = 'force-dynamic';

/**
 * POST handler receives an audio file upload, sends it to OpenAI's Whisper
 * transcription endpoint, and returns the resulting text.
 */
export async function POST(req: NextRequest) {
    try {
        // Parse the incoming form data (expecting an uploaded file under key "file")
        const formData = await req.formData();
        const file = formData.get('file') as File;

        // Validate that we got a file, that it's non‑empty, and that it's audio
        if (!file || file.size === 0 || !file.type.startsWith('audio/')) {
            console.warn('Invalid or missing audio file');
            return NextResponse.json({ error: 'Invalid or empty audio file' }, { status: 400 });
        }

        // Read the entire file into a Buffer so we can write it to disk
        const buffer = Buffer.from(await file.arrayBuffer());
        // Build a temporary file path in the OS default temp directory
        const tempFilePath = path.join(os.tmpdir(), file.name);

        // Enforce a maximum upload size (25 MB) to avoid huge files
        const MAX_SIZE = 25 * 1024 * 1024; // 25 MB
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'Audio file exceeds 25MB limit' }, { status: 400 });
        }
        // Write the uploaded audio to the temporary file
        await fs.promises.writeFile(tempFilePath, buffer);

        // Double‑check that the temp file was created successfully
        if (!fs.existsSync(tempFilePath)) {
            return NextResponse.json({ error: 'Temp file was not created' }, { status: 500 });
        }

        // Build the multipart/form-data payload for the Whisper API
        const form = new FormData();
        form.append('file', createReadStream(tempFilePath), {
            filename: file.name,
            contentType: file.type,
        });
        form.append('model', 'whisper-1');
        form.append('response_format', 'text');
        form.append('language', responseLanguage);

        // Send the audio to OpenAI's transcription endpoint
        const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
            headers: {
                // Use our OpenAI API key from environment variables
                Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
                ...form.getHeaders(),
            },
            responseType: 'text', // expect plain-text response
            timeout: 30_000, // 30-second timeout
        });

        // Clean up the temporary file after transcription
        await fs.promises.unlink(tempFilePath);

        // Return the transcript text back to the caller
        return NextResponse.json({ transcription: response.data });
    } catch (error) {
        // Prepare a human‑readable error message
        let errorMessage = 'Unknown error';

        if (axios.isAxiosError(error)) {
            // If the error came from axios/OpenAI, log status and payload for debugging
            console.error('Axios error response:', {
                status: error.response?.status,
                data: error.response?.data,
                headers: error.response?.headers,
            });
            errorMessage = `${error.message} - ${JSON.stringify(error.response?.data)}`;
        } else if (error instanceof Error) {
            // Standard JavaScript Error
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            // Someone threw a string instead of an Error
            errorMessage = error;
        }

        // Return a 500 Internal Server Error with the message
        return NextResponse.json({ error: `Failed to transcribe audio: ${errorMessage}` }, { status: 500 });
    }
}
