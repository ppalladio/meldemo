import { testSystemPrompt } from '@/lib/constant';
import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { prompt, history = [] } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
        }

        const messages = [{ role: 'system', content: testSystemPrompt }, ...history, { role: 'user', content: prompt }];

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
        });

        const text = completion.choices[0]?.message?.content ?? '...';

        const tts = await openai.audio.speech.create({
            model: 'gpt-4o-mini-tts',
            voice: 'coral',
            input: text,
            instructions: 'Speak in a friendly and curious tone suitable for a dog character speaking Catalan.',
            response_format: 'mp3',
        });

        const buffer = Buffer.from(await tts.arrayBuffer());
        const audioBase64 = buffer.toString('base64');

        return NextResponse.json({
            text,
            audio: audioBase64,
        });
    } catch (error) {
        if (error instanceof OpenAI.APIError) {
            console.error('[OpenAI TTS API Error]', {
                message: error.message,
                type: error.type,
                param: error.param,
                code: error.code,
                status: error.status,
            });
        } else {
            console.error('[Assistant Error]', error);
        }

        let errorMessage = 'Unknown error';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
