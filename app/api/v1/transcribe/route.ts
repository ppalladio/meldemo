import { responseLanguage } from '@/lib/constant';
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
            console.warn('Invalid or missing audio file');
            return NextResponse.json({ error: 'Invalid or empty audio file' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const tempFilePath = path.join(os.tmpdir(), file.name);
 
        const MAX_SIZE = 25 * 1024 * 1024; // 25 MB
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'Audio file exceeds 25MB limit' }, { status: 400 });
        }
        await fs.promises.writeFile(tempFilePath, buffer);

        if (!fs.existsSync(tempFilePath)) {
            return NextResponse.json({ error: 'Temp file was not created' }, { status: 500 });
        }

        const form = new FormData();
        form.append('file', createReadStream(tempFilePath), {
            filename: file.name,
            contentType: file.type,
        });
        form.append('model', 'whisper-1');
        form.append('response_format', 'text');
        form.append('language', responseLanguage);

        const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
                ...form.getHeaders(),
            },
            responseType: 'text',
            timeout: 30000,
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
