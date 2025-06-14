/**
 * README: TTS Route
 *
 * This file defines a POST endpoint that accepts a text prompt and optional chat history,
 * uses OpenAI's Chat API to generate an AI text reply, then calls OpenAI's TTS API
 * to convert that text into speech (MP3). The response JSON includes both the AI text
 * and a Base64-encoded MP3 audio string for playback.
 */
// Import our chat and TTS model settings and system prompt
import { openaiModal, systemContent, ttsModal, ttsVoice } from '@/lib/constant';
// Next.js types for handling HTTP requests and responses
import { NextRequest, NextResponse } from 'next/server';
// Official OpenAI API client library
import { OpenAI } from 'openai';

// Initialize the OpenAI client with our secret API key
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Disable caching: always handle this route dynamically
export const dynamic = 'force-dynamic';

// Handle POST requests: receive text prompts and return synthesized speech
export async function POST(req: NextRequest) {
    try {
        // Read JSON body containing the text prompt and an optional chat history array
        const { prompt, history = [] } = await req.json();

        // Ensure the request included a text prompt
        if (!prompt) {
            return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
        }

        // Build the chat messages array: system instruction + previous messages + user prompt
        const messages = [{ role: 'system', content: systemContent }, ...history, { role: 'user', content: prompt }];

        // Ask the OpenAI chat model to generate a response based on our messages
        const completion = await openai.chat.completions.create({
            model: openaiModal,
            messages,
        });

        // Extract the assistant's text reply; check that it exists
        const text = `${completion.choices[0]?.message?.content}`;
        if (!text) {
            return NextResponse.json({ error: 'Missing text' }, { status: 400 });
        }
        // Convert the assistant's text reply to speech (MP3) via OpenAI's audio API
        const tts = await openai.audio.speech.create({
            model: ttsModal,
            voice: ttsVoice,
            input: text,
            response_format: 'mp3',
        });

        // Turn the received MP3 audio data into a Base64 string for easy transport
        const buffer = Buffer.from(await tts.arrayBuffer());
        const audioBase64 = buffer.toString('base64');

        // Return both the text reply and the audio data to the client
        return NextResponse.json({
            text,
            audio: audioBase64,
        });
    } catch (error) {
        // If the error came from the OpenAI API, log full details for debugging
        if (error instanceof OpenAI.APIError) {
            console.error('[OpenAI TTS API Error]', {
                message: error.message,
                type: error.type,
                param: error.param,
                code: error.code,
                status: error.status,
            });
        } else {
            // Otherwise log a general error
            console.error('[Assistant Error]', error);
        }

        // Prepare a user-facing error message
        let errorMessage = 'Unknown error';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        // Return a 500 response with the error message
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
