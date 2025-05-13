'use client';
import axios, { AxiosError } from 'axios';
import { useEffect, useRef, useState } from 'react';

interface SpeechFoundCallback {
    (text: string): void;
}

export enum CharacterState {
    Idle,
    Listening,
    Speaking,
}

const isDebugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

const useSpeechRecognition = () => {
    const [characterState, setCharacterState] = useState<CharacterState>(CharacterState.Idle);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const recordedChunks = useRef<Blob[]>([]);
    const onSpeechFoundCallback = useRef<SpeechFoundCallback>((text) => {});
    const audioContext = useRef<AudioContext | null>(null);
    const analyser = useRef<AnalyserNode | null>(null);
    const stream = useRef<MediaStream | null>(null);
    const source = useRef<MediaStreamAudioSourceNode | null>(null);
    const bars = useRef<(HTMLDivElement | null)[]>([]);

    const setOnSpeechFoundCallback = (callback: SpeechFoundCallback) => {
        onSpeechFoundCallback.current = callback;
    };

    // Pre-setup function to be called earlier in the app lifecycle
    const setupMedia = async () => {
        try {
            stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContext.current = new AudioContext();
            analyser.current = audioContext.current.createAnalyser();
            source.current = audioContext.current.createMediaStreamSource(stream.current);
            source.current.connect(analyser.current);
            mediaRecorder.current = new MediaRecorder(stream.current);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        setupMedia(); // Call the setup function when the component mounts

        return () => {
            // Cleanup function to close all media when the component unmounts
            stream.current?.getTracks().forEach((track) => track.stop());
            if (audioContext.current) {
                audioContext.current.close();
            }
        };
    }, []); // Empty dependency array to ensure this runs only once on mount

    const startRecording = () => {
        // Check if MediaRecorder already exists and reuse if possible
        if (!mediaRecorder.current || !audioContext.current) {
            if (!stream.current) {
                console.error('Stream is null, cannot start recording.');
                return;
            }
            console.log('start recording');
            if (!audioContext.current) {
                audioContext.current = new AudioContext();
            }
            console.log('recording check');
            analyser.current = audioContext.current.createAnalyser();
            console.log('🚀 ~ startRecording ~ analyser.current:', analyser.current);
            source.current = audioContext.current.createMediaStreamSource(stream.current);
            console.log('🚀 ~ startRecording ~ source.current:', source.current);
            source.current.connect(analyser.current);
            mediaRecorder.current = new MediaRecorder(stream.current);
        }

        mediaRecorder.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.current.push(event.data);
            }
        };

        mediaRecorder.current.start();
        setCharacterState(CharacterState.Listening);
    };

    // Call the function and check the recordedChunks array
    const stopRecording = async () => {
        if (!mediaRecorder.current) {
            console.error('MediaRecorder is null, cannot stop recording.');
            return;
        }

        mediaRecorder.current.stop();

        await new Promise<void>((resolve) => {
            if (mediaRecorder.current) {
                mediaRecorder.current.onstop = (event) => {
                    resolve();
                };
            }
        });

        if (recordedChunks.current.length > 0) {
            const blob = new Blob(recordedChunks.current, { type: 'audio/webm' });
            recordedChunks.current = [];
            const file = new File([blob], 'audio.webm', { type: 'audio/webm' });
            console.log('file', file);
            setCharacterState(CharacterState.Speaking);

            await recognize(file);
        } else {
            console.error('No audio data recorded.');
        }
    };

    const recognize = async (file: File) => {
        if (isDebugMode) {
            // In debug mode, skip ASR and return a placeholder transcription
            console.log('Debug mode: skipping ASR and returning placeholder transcription');
            onSpeechFoundCallback.current('This is a placeholder transcription in debug mode.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        // Debugging: Log FormData entries
        try {
            const response = await axios.post('/api/v1/transcribe', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            console.log('🚀 ~ recognize ~ response:', response);

            const data = response.data;
            const transcript = data.transcription;
            onSpeechFoundCallback.current(transcript);
        } catch (error) {
            if (error instanceof AxiosError) {
                console.log(error);
            }
            throw new Error(`Failed to transcribe audio with status: ${error.status}`);
        }
    };

    // const downloadFile = (blob: Blob) => {
    //     const url = URL.createObjectURL(blob);
    //     const a = document.createElement('a');
    //     a.href = url;
    //     a.download = 'recorded_audio.webm'; // You can set the filename here
    //     document.body.appendChild(a);
    //     a.click();
    //     a.remove();
    //     URL.revokeObjectURL(url);
    // };

    // useEffect(() => {
    //     let animationFrameId: number | null = null;
    //     let timeoutId: NodeJS.Timeout | null = null;

    //     const animationLoop = () => {
    //         if (!analyser.current) return;

    //         analyser.current.fftSize = 32;
    //         const bufferLength = analyser.current.frequencyBinCount;
    //         const dataArray = new Uint8Array(bufferLength);

    //         analyser.current.getByteFrequencyData(dataArray);

    //         const avgVolume = dataArray.reduce((acc, val) => acc + val) / bufferLength;
    //         const maxHeight = 80;

    //         bars.current.forEach((bar, index) => {
    //             if (bar) {
    //                 let height = (avgVolume / 255) * maxHeight;
    //                 let marginTop = 0;
    //                 if (index !== 1) {
    //                     height *= 0.7;
    //                 }
    //                 height = Math.max(height, 6);
    //                 marginTop = (maxHeight - height) / 2;
    //                 bar.style.height = `${height}px`;
    //                 bar.style.marginTop = `${marginTop}px`;
    //             }
    //         });

    //         timeoutId = setTimeout(() => {
    //             animationFrameId = requestAnimationFrame(animationLoop);
    //         }, 50);
    //     };

    //     if (characterState === CharacterState.Listening) {
    //         animationLoop();
    //     } else {
    //         if (animationFrameId !== null) {
    //             cancelAnimationFrame(animationFrameId);
    //         }
    //         if (timeoutId !== null) {
    //             clearTimeout(timeoutId);
    //         }
    //     }

    //     return () => {
    //         if (animationFrameId !== null) {
    //             cancelAnimationFrame(animationFrameId);
    //         }
    //         if (timeoutId !== null) {
    //             clearTimeout(timeoutId);
    //         }
    //     };
    // }, [characterState, bars, analyser]);

    // const recognize = async (file: File) => {
    //     const formData = new FormData();
    //     formData.append('file', file);
    //     console.log("🚀 ~ recognize ~ formData:", formData)

    //     try {
    //         const response = await axios.post('/api/v1/transcribe', formData, {
    //             headers: {
    //                 'Content-Type': 'multipart/form-data',
    //             },
    //         });
    //         console.log("🚀 ~ recognize ~ response:", response)

    //         if (response.status !== 200) {
    //             throw new Error(`Failed to transcribe audio with status: ${response.status}`);
    //         }

    //         const data = response.data; // Use response.data directly
    //         console.log("🚀 ~ recognize ~ data:", data)
    //         const transcript = data.transcription;
    //         onSpeechFoundCallback.current(transcript);
    //     } catch (error) {
    //         console.error('Error fetching transcription:', error);
    //     }
    // };
    const onMicButtonPressed = () => {
        if (characterState === CharacterState.Idle) {
            startRecording();
        } else if (characterState === CharacterState.Listening) {
            stopRecording();
        }
    };

    return { startRecording, stopRecording, characterState, bars, setCharacterState, onMicButtonPressed, setOnSpeechFoundCallback };
};

export default useSpeechRecognition;
