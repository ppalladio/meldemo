'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import useSpeechRecognition, { CharacterState } from '@/hooks/useSpeechRecognition';
import useTTS from '@/hooks/useTTS';
import { Mic, MicOff } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Dialog() {
    const [inputText, setInputText] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [isLoadingResponse, setIsLoadingResponse] = useState(false);
    const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);

    const { stopPlayback, play, setOnProcessCallback, isPlayingRef } = useTTS();

    const { startRecording, stopRecording, characterStateRef, setOnSpeechFoundCallback } = useSpeechRecognition();

    const isRecording = characterStateRef.current === CharacterState.Listening;

    const handleMicClick = () => {
        if (isPlayingRef.current) {
            console.log('[Dialog] AI speech in progress — stopping it.');
            stopPlayback();
        }

        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    useEffect(() => {
        setOnProcessCallback((frame) => {
            const energy = Math.max(...frame.map(Math.abs));
            // Optional: use `energy` for visual animation feedback
            console.log('Audio energy:', energy);
        });
    }, [setOnProcessCallback]);

    useEffect(() => {
        setOnSpeechFoundCallback(async (userText) => {
            setInputText(userText);
            setIsLoadingResponse(true);

            const updatedHistory = [...history, { role: 'user' as const, content: userText }];
            setHistory(updatedHistory);

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
                    await play(audioBuffer);
                }
            } catch (err) {
                console.error('[Dialog] Error fetching assistant response:', err);
                setAiResponse('Error processing assistant response.');
            } finally {
                setIsLoadingResponse(false);
            }
        });
    }, [history, play, setOnSpeechFoundCallback]);

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
