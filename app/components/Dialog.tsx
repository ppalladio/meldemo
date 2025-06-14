/**
 * README: Dialog Component
 *
 * A React UI component that handles voice interaction with an AI assistant.
 * - Shows a text area with transcribed user speech.
 * - Lets the user start/stop recording via a microphone button.
 * - Sends the transcribed text to the TTS/AI endpoint.
 * - Plays back the AI assistant's voice response and shows its text.
 */
'use client'; // This component must be rendered on the client (browser)

import { Button } from '@/components/ui/button';
// Custom hook for handling speech recognition and transcription
import useSpeechRecognition, { CharacterState } from '@/hooks/useSpeechRecognition';

import { Mic, MicOff } from 'lucide-react'; // Microphone icons
import { useEffect, useState } from 'react'; // React hooks for state and side effects
// Props expected by the Dialog component: functions for playing/stopping audio and a flag for playback state
interface DialogProps {
    readonly play: (audio: ArrayBuffer) => Promise<void>;
    readonly stopPlayback: () => void;
    readonly isPlaying: boolean;
}

// Dialog component manages voice input, displays transcribed text, sends it to the assistant, and plays back the response
export default function Dialog({ play, stopPlayback, isPlaying }: DialogProps) {
    // State to hold the latest transcribed text from the user's speech
    const [inputText, setInputText] = useState('');
    // State to hold the AI assistant's text response
    const [aiResponse, setAiResponse] = useState('');
    // Is the assistant's response currently being fetched?
    const [isLoadingResponse, setIsLoadingResponse] = useState(false);
    // History of messages exchanged (for context in multi-turn conversation)
    const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);

    // Initialize speech recognition hook to start/stop recording and get transcription
    const { startRecording, stopRecording, characterStateRef, setOnSpeechFoundCallback, isTranscribing, errorMessage } = useSpeechRecognition();

    // Determine if we are currently listening (recording) based on the character state
    const isRecording = characterStateRef.current === CharacterState.Listening;

    // Handler for when mic button is clicked: toggle between recording and stopping
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

    // Set up callback: when speech is transcribed, send it to the assistant and handle the response
    useEffect(() => {
        setOnSpeechFoundCallback(async (userText) => {
            // Save the transcribed user text and start loading state
            setInputText(userText);
            setIsLoadingResponse(true);

            // Build new history array including user's latest message
            const updatedHistory = [...history, { role: 'user' as const, content: userText }];
            setHistory(updatedHistory);

            try {
                // Send the prompt and history to our TTS API to get assistant response and audio
                const res = await fetch('/api/v1/tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: userText, history: updatedHistory }),
                });

                const data = await res.json();
                if (data.text && data.audio) {
                    // If both text and audio come back, update state and play audio
                    setAiResponse(data.text);
                    setHistory((prev) => [...prev, { role: 'assistant', content: data.text }]);

                    // Convert the Base64-encoded audio back into binary data for playback
                    const audioBuffer = Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0)).buffer;
                    await play(audioBuffer);
                }
            } catch (err) {
                // If something goes wrong with the assistant API, log it and show a fallback message
                console.error('[Dialog] Error fetching assistant response:', err);
                setAiResponse('Error processing assistant response.');
            } finally {
                // Done loading assistant response
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
            <section className="space-y-3">
                {errorMessage && process.env.NEXT_PUBLIC_DEBUG_MODE === 'true' && (
                    <>
                        <h1>error msg</h1>
                        <div className="bg-red-100 text-red-800 p-2 rounded mt-2 text-sm">{errorMessage}</div>
                    </>
                )}
            </section>
        </div>
    );
}
