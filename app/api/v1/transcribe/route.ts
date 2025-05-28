import axios from 'axios';
import FormData from 'form-data';
import fs, { createReadStream } from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import os from 'os';
import path from 'path';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file || file.size === 0 || !file.type.startsWith('audio/')) {
            return NextResponse.json({ error: 'Invalid or empty audio file' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const tempFilePath = path.join(os.tmpdir(), file.name);
        await fs.promises.writeFile(tempFilePath, buffer);

        const openAIForm = new FormData();
        const fileStream = createReadStream(tempFilePath);

        openAIForm.append('file', fileStream, {
            filename: file.name,
            contentType: file.type,
        });

        openAIForm.append('model', 'whisper-1'); // Use whisper-1 for transcription
        openAIForm.append('response_format', 'text');
        openAIForm.append('language', 'en');

        const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', openAIForm, {
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
                ...openAIForm.getHeaders(),
            },
            responseType: 'text',
        });

        await fs.promises.unlink(tempFilePath);

        return NextResponse.json({ transcription: response.data });
    } catch (error) {
        let errorMessage = 'Unknown error';
        if (axios.isAxiosError(error)) {
            console.error('Axios error response:', {
                status: error.response?.status,
                data: error.response?.data,
                headers: error.response?.headers,
            });
            errorMessage = `${error.message} - ${JSON.stringify(error.response?.data)}`;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }

        return NextResponse.json({ error: `Failed to transcribe audio: ${errorMessage}` }, { status: 500 });
    }
}
