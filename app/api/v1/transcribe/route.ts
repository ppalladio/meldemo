import axios, { AxiosError } from 'axios';
import FormData from 'form-data';
import { createReadStream } from 'fs';
import fs from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import os from 'os';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const tempFilePath = `${os.tmpdir()}/${file.name}`;
        await fs.writeFile(tempFilePath, buffer);

        const openAIForm = new FormData();
        openAIForm.append('file', createReadStream(tempFilePath));
        openAIForm.append('model', 'gpt-4o-transcribe');
        openAIForm.append('response_format', 'text');
        // todo change language recognition code
        openAIForm.append('language', 'en');
        const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', openAIForm, {
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
                ...openAIForm.getHeaders(),
            },
            responseType: 'text',
        });

        const transcriptText = response.data;

        await fs.unlink(tempFilePath); // clean up

        if (response.status !== 200) {
            const errText = await response.data;
            console.error('OpenAI error:', errText);
            return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
        }

        return NextResponse.json({ transcription: transcriptText });
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
	
		return NextResponse.json(
			{ error: `Failed to transcribe audio: ${errorMessage}` },
			{ status: 500 }
		);
	} 
}
