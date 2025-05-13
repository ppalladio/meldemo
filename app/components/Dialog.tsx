// Dialog.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import useSpeechRecognition from '@/hooks/useSpeechRecognition';
import useTTS from '@/hooks/useTTS';
import { Mic, MicOff } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Dialog() {
    const [inputText, setInputText] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isLoadingResponse, setIsLoadingResponse] = useState(false);
    const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);

    const { startRecording, stopRecording, setOnSpeechFoundCallback } = useSpeechRecognition();
    const { play, setOnProcessCallback } = useTTS();

    // Optional: for animation
    useEffect(() => {
        setOnProcessCallback((frame) => {
            const energy = Math.max(...frame.map(Math.abs));
            // TODO: Trigger mouth/character animation with `energy`
            console.log('Audio energy:', energy);
        });
    }, [setOnProcessCallback]);

    useEffect(() => {
        setOnSpeechFoundCallback(async (userText) => {
            setInputText(userText);
            setIsLoadingResponse(true);
            const updatedHistory = [...history, { role: 'user', content: userText }];
            setHistory(
                history.map((msg) => ({
                    role: msg.role,
                    content: msg.content,
                })),
            );

            try {
                const res = await fetch('/api/v1/tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: userText, history: updatedHistory }),
                });

                const data = await res.json();
                if (data.text && data.audio) {
                    setAiResponse(data.text);
                    setHistory((prev) => [...prev, { role: 'assistant', content: data.text }]);

                    const audioBuffer = Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0)).buffer;
                    await play(audioBuffer); // triggers animation
                }
            } catch (err) {
                console.error(err);
                setAiResponse('Error processing assistant response.');
            } finally {
                setIsLoadingResponse(false);
            }
        });
    }, [history, play, setOnSpeechFoundCallback]);

    const handleMicClick = () => {
        if (isRecording) stopRecording();
        else startRecording();
        setIsRecording(!isRecording);
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24 bg-gray-100">
            <div className="w-full max-w-2xl space-y-10">
                <h1 className="text-3xl font-bold text-center">AI Assistant</h1>

                <section className="space-y-2">
                    <h2 className="text-xl font-semibold">Input</h2>
                    <Card className="p-4 min-h-[150px]">
                        <p className="whitespace-pre-wrap text-base text-gray-800">{inputText || 'Press the mic and speak.'}</p>
                    </Card>
                </section>

                <div className="flex justify-center">
                    <Button
                        onClick={handleMicClick}
                        className={`gap-2 px-6 py-3 text-lg font-semibold ${isRecording ? 'bg-red-600 hover:bg-red-700' : ''}`}
                    >
                        {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                        {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </Button>
                </div>

                <section className="space-y-2">
                    <h2 className="text-xl font-semibold">AI Response</h2>
                    <Card className="p-4 min-h-[150px]">
                        <p className="whitespace-pre-wrap text-base text-gray-800">
                            {isLoadingResponse ? 'Thinking...' : aiResponse || 'AI response will appear here after you speak.'}
                        </p>
                    </Card>
                </section>
            </div>
        </main>
    );
}
