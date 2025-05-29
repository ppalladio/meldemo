import { openaiModal, systemContent, ttsModal, ttsVoice } from '@/lib/constant';
import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export const dynamic = 'force-dynamic';
export enum Role {
    System = 'system',
    Assistant = 'assistant',
    User = 'user',
}
export async function POST(req: NextRequest) {
    try {
        const { prompt, history = [] } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
        }

        const messages = [{ role: Role.System, content: systemContent }, ...history, { role: Role.User, content: prompt }];

        const completion = await openai.chat.completions.create({
            model: openaiModal,
            messages,
        });

        const text = ` ${completion.choices[0]?.message?.content}`;
        if (!text) {
            return NextResponse.json({ error: 'Missing text' }, { status: 400 });
        }
        const tts = await openai.audio.speech.create({
            model: ttsModal,
            voice: ttsVoice,
            input: text,
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
