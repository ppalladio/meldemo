'use client';

import { MIN_ENERGY_THRESHOLD } from '@/lib/constant';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';

type SpeechFoundCallback = (text: string) => void;
const supportedTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
export enum CharacterState {
    Idle,
    Listening,
    Speaking,
}

// const isDebugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

const useSpeechRecognition = (stopPlayback?: () => void) => {
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const recordedChunks = useRef<Blob[]>([]);
    const onSpeechFoundCallback = useRef<SpeechFoundCallback>(() => {});
    const audioContext = useRef<AudioContext | null>(null);
    const analyser = useRef<AnalyserNode | null>(null);
    const stream = useRef<MediaStream | null>(null);
    const source = useRef<MediaStreamAudioSourceNode | null>(null);
    const bars = useRef<(HTMLDivElement | null)[]>([]);
    const hadSpeech = useRef(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const characterStateRef = useRef<CharacterState>(CharacterState.Idle);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const setCharacterState = (state: CharacterState) => {
        characterStateRef.current = state;
        _setCharacterState(state);
    };
    const [, _setCharacterState] = useState<CharacterState>(CharacterState.Idle);

    const setOnSpeechFoundCallback = (callback: SpeechFoundCallback) => {
        onSpeechFoundCallback.current = callback;
    };

    const setupMedia = async () => {
        try {
            stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContext.current = new AudioContext();
            analyser.current = audioContext.current.createAnalyser();
            source.current = audioContext.current.createMediaStreamSource(stream.current);
            source.current.connect(analyser.current);

            const mimeType = supportedTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
            console.log('🎙️ Using MIME type for recording:', mimeType);

            mediaRecorder.current = new MediaRecorder(stream.current, { mimeType });
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        setupMedia();

        return () => {
            stream.current?.getTracks().forEach((track) => track.stop());
            if (audioContext.current) {
                audioContext.current.close();
            }
        };
    }, []);

    const startRecording = async () => {
        hadSpeech.current = false;

        try {
            if (!audioContext.current || !stream.current) {
                stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioContext.current = new AudioContext();
            }

            if (!analyser.current || !source.current) {
                analyser.current = audioContext.current.createAnalyser();
                source.current = audioContext.current.createMediaStreamSource(stream.current);
                source.current.connect(analyser.current);
            }

            mediaRecorder.current ??= new MediaRecorder(stream.current);

            analyser.current.fftSize = 2048;
            const dataArray = new Float32Array(analyser.current.fftSize);

            const energyMonitor = () => {
                // console.log('🚀 ~ energyMonitor ~ characterStateRef.current:', characterStateRef.current);
                // console.log('🚀 ~ energyMonitor ~ analyser.current:', analyser.current);
                if (characterStateRef.current === CharacterState.Listening && analyser.current) {
                    analyser.current.getFloatTimeDomainData(dataArray);
                    const energy = Math.max(...dataArray.map(Math.abs));
                    // console.log('🚀 ~ energyMonitor ~ energy:', energy);
                    if (energy > MIN_ENERGY_THRESHOLD) {
                        hadSpeech.current = true;
                    }
                    requestAnimationFrame(energyMonitor);
                }
            };

            recordedChunks.current = [];

            mediaRecorder.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.current.push(event.data);
                }
            };

            setCharacterState(CharacterState.Listening); // ✅ Set before monitoring
            mediaRecorder.current.start();
            energyMonitor(); // ✅ Start after setting state
        } catch (err) {
            console.error('Failed to start recording:', err);
        }
    };

    const stopRecording = async () => {
        if (!mediaRecorder.current) {
            console.error('MediaRecorder is null.');
            return;
        }

        mediaRecorder.current.stop();

        await new Promise<void>((resolve) => {
            if (mediaRecorder.current) {
                mediaRecorder.current.onstop = () => resolve();
            }
        });

        if (!hadSpeech.current) {
            console.warn('[SpeechRecognition] Low or no speech detected — ignoring.');
            setCharacterState(CharacterState.Idle);
            return;
        }

        if (recordedChunks.current.length > 0) {
            const blob = new Blob(recordedChunks.current, { type: mediaRecorder.current?.mimeType || 'audio/webm' });

            console.log('🧪 Recorded blob type:', blob.type, 'size:', blob.size);
            if (blob.size === 0) {
                console.warn('⚠️ Skipping: Empty audio blob');
                setCharacterState(CharacterState.Idle);
                return;
            }

            const file = new File([blob], 'recording.webm', { type: blob.type });
            console.log(blob.type); // should be audio/webm or audio/ogg
            console.log(blob.size); // should be > 0
            recordedChunks.current = [];

            console.log('🚀 ~ stopRecording ~ file:', file.type);
            setCharacterState(CharacterState.Speaking);
            await recognize(file);
        } else {
            console.error('No audio data recorded.');
            setCharacterState(CharacterState.Idle);
        }
    };

    const recognize = async (file: File) => {
        // debugging mobiles
        console.log('Audio file size:', file.size, 'bytes');
        if (file.size === 0) {
            console.warn('Audio file is empty. Skipping transcription.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        // debugging
        // formData.append('debug', isDebugMode.toString());
        try {
            setIsTranscribing(true); // ⏳ Show "thinking"
            const response = await axios.post('/api/v1/transcribe', formData);

            const data = response.data;
            const transcript = data.transcription?.trim();
            onSpeechFoundCallback.current(transcript);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const data = error.response?.data;
                const message = data?.error || error.message;

                console.error('[Transcribe API Error]', { status, data });
                setErrorMessage(`Transcription failed (${status}): ${message}`);
                console.error('Transcription failed:', error.message || error);
                throw new Error(`Failed to transcribe audio: ${error.message}`);
            } else {
                console.error('[Transcribe Error]', error);
                setErrorMessage(`Audio unsupported or malformed (  ${error}`);
            }
        } finally {
            setIsTranscribing(false); 
        }
    };
    const onMicButtonPressed = () => {
        // Stop any ongoing TTS speech playback before recording
        if (stopPlayback) {
            stopPlayback();
        }

        if (characterStateRef.current === CharacterState.Idle) {
            startRecording();
        } else if (characterStateRef.current === CharacterState.Listening) {
            stopRecording();
        }
    };
    return {
        startRecording,
        stopRecording,
        characterStateRef,
        bars,
        setCharacterState,
        onMicButtonPressed,
        setOnSpeechFoundCallback,
        CharacterState,
        isTranscribing,
        errorMessage,
    };
};

export default useSpeechRecognition;
