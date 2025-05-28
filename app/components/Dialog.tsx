'use client';

import { Button } from '@/components/ui/button';
import useSpeechRecognition, { CharacterState } from '@/hooks/useSpeechRecognition';

import { Mic, MicOff } from 'lucide-react';
import { useEffect, useState } from 'react';
interface DialogProps {
    readonly play: (audio: ArrayBuffer) => Promise<void>;
    readonly stopPlayback: () => void;
    readonly isPlaying: boolean;
}

export default function Dialog({ play, stopPlayback, isPlaying }: DialogProps) {
    const [inputText, setInputText] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [isLoadingResponse, setIsLoadingResponse] = useState(false);
    const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);

    const { startRecording, stopRecording, characterStateRef, setOnSpeechFoundCallback, isTranscribing, errorMessage } = useSpeechRecognition();

    const isRecording = characterStateRef.current === CharacterState.Listening;

    const handleMicClick = () => {
        if (isPlaying) {
            stopPlayback();
        }

        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

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
        <div className="w-full max-w-2xl space-y-10 ">
            <h1 className="text-3xl font-bold text-center">AI assistant</h1>

            {/* Input Section */}
            <section className="space-y-3  ">
                <div className="bg-white border rounded-xl p-5 shadow-sm min-w-[400px] min-h-[200px] flex flex-col justify-between">
                    <p className="text-base text-gray-800 whitespace-pre-wrap mb-4">
                        {isTranscribing ? 'Wait a second...' : inputText || 'Press the mic and speak.'}
                    </p>

                    <div className="flex justify-end">
                        <Button
                            onClick={handleMicClick}
                            className="bg-black text-white px-5 py-2.5 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-gray-900"
                        >
                            {isRecording ? (
                                <>
                                    <MicOff className="w-4 h-4" />
                                    Stop Voice Input
                                </>
                            ) : (
                                <>
                                    <Mic className="w-4 h-4" />
                                    Start Voice Input
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </section>

            {/* Response Section */}
            <section className="space-y-3 ">
                <h2 className="text-lg font-semibold">AI Response</h2>
                <div className="bg-white border rounded-xl p-5 shadow-sm  min-w-[400px] min-h-[200px]">
                    <p className={`text-base whitespace-pre-wrap ${isLoadingResponse || !aiResponse ? 'text-gray-400 italic' : 'text-gray-800'}`}>
                        {isLoadingResponse ? 'Thinking...' : aiResponse || 'AI response will appear here after you speak and stop recording.'}
                    </p>
                </div>
            </section>
            {/* error logging */}
            <section>{errorMessage && <div className="bg-red-100 text-red-800 p-2 rounded mt-2 text-sm">{errorMessage}</div>}</section>
        </div>
    );
}
