// Ensure this hook only runs in the browser (client)
'use client';
/**
 * README: useSpeechRecognition Hook
 *
 * A React hook that records from the user's microphone, discerns real speech
 * (vs background noise), then sends the audio to /api/v1/transcribe for
 * speech-to-text. It provides callbacks and state flags for UI components
 * to show loading, errors, and the transcript result.
 */

// Import minimum energy level to detect valid speech (to ignore background noise)
import { MIN_ENERGY_THRESHOLD } from '@/lib/constant';
// HTTP client for sending recorded audio to our transcription API
import axios from 'axios';
// React utilities for managing component lifecycle, state, and mutable refs
import { useEffect, useRef, useState } from 'react';

// Type for the callback invoked when transcribed text is available
type SpeechFoundCallback = (text: string) => void;
// Preferred audio MIME types for MediaRecorder; uses the first supported one
const supportedTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
// Enum to track the UI character's state: not listening, listening, or speaking
export enum CharacterState {
    Idle,
    Listening,
    Speaking,
}

// Flag to include additional debug data if enabled via environment
const isDebugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

// Custom hook that records audio, detects speech, sends it for transcription,
// and returns control functions and state for UI components
const useSpeechRecognition = (stopPlayback?: () => void) => {
    // Refs for recording data and audio processing nodes
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const recordedChunks = useRef<Blob[]>([]);
    const onSpeechFoundCallback = useRef<SpeechFoundCallback>(() => {});
    const audioContext = useRef<AudioContext | null>(null);
    const analyser = useRef<AnalyserNode | null>(null);
    const stream = useRef<MediaStream | null>(null);
    const source = useRef<MediaStreamAudioSourceNode | null>(null);
    const bars = useRef<(HTMLDivElement | null)[]>([]);
    // Flag to detect if speech energy threshold was exceeded
    const hadSpeech = useRef(false);
    // State to show loading/transcribing and capture any errors
    const [isTranscribing, setIsTranscribing] = useState(false);
    const characterStateRef = useRef<CharacterState>(CharacterState.Idle);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Helper to sync ref and state for the character's UI state
    const setCharacterState = (state: CharacterState) => {
        characterStateRef.current = state;
        _setCharacterState(state);
    };
    const [, _setCharacterState] = useState<CharacterState>(CharacterState.Idle);

    // Set the callback that will be called when we get a speech transcript
    const setOnSpeechFoundCallback = (callback: SpeechFoundCallback) => {
        onSpeechFoundCallback.current = callback;
    };

    // Prepare microphone stream, audio context, analyser node, and media recorder
    const setupMedia = async () => {
        try {
            stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContext.current = new AudioContext();
            analyser.current = audioContext.current.createAnalyser();
            source.current = audioContext.current.createMediaStreamSource(stream.current);
            source.current.connect(analyser.current);

            const mimeType = supportedTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';

            mediaRecorder.current = new MediaRecorder(stream.current, { mimeType });
        } catch (err) {
            console.error(err);
        }
    };

    // Initialize media input when the hook mounts; clean up on unmount
    useEffect(() => {
        setupMedia();

        return () => {
            stream.current?.getTracks().forEach((track) => track.stop());
            audioContext.current?.close();
        };
    }, []);

    // Begin recording audio and monitoring energy for speech detection
    const startRecording = async () => {
        // Reset speech detection flag
        hadSpeech.current = false;

        try {
            // Ensure audio context and microphone stream are available
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

            // Prepare analyser for reading audio amplitude data
            analyser.current.fftSize = 2048;
            const dataArray = new Float32Array(analyser.current.fftSize);

            // Function to check if user is actually speaking (vs silence or noise)
            const energyMonitor = () => {
                if (characterStateRef.current === CharacterState.Listening && analyser.current) {
                    analyser.current.getFloatTimeDomainData(dataArray);
                    const energy = Math.max(...dataArray.map(Math.abs));
                    if (energy > MIN_ENERGY_THRESHOLD) {
                        hadSpeech.current = true;
                    }
                    requestAnimationFrame(energyMonitor);
                }
            };

            // Clear any previous audio data
            recordedChunks.current = [];

            // Collect recorded audio chunks when available
            mediaRecorder.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.current.push(event.data);
                }
            };

            // Start listening state and begin recording and monitoring
            setCharacterState(CharacterState.Listening);
            mediaRecorder.current.start();
            energyMonitor();
        } catch (err) {
            console.error('Failed to start recording:', err);
        }
    };

    // Stop recording and process the captured audio for transcription
    const stopRecording = async () => {
        // Guard against missing recorder instance
        if (!mediaRecorder.current) {
            console.error('MediaRecorder is null.');
            return;
        }

        // Stop the media recorder (async)
        mediaRecorder.current.stop();

        // Wait until recording has fully stopped
        await new Promise<void>((resolve) => {
            if (mediaRecorder.current) {
                mediaRecorder.current.onstop = () => resolve();
            }
        });

        // If no valid speech energy was detected, ignore this clip
        if (!hadSpeech.current) {
            console.warn('[SpeechRecognition] Low or no speech detected — ignoring.');
            setCharacterState(CharacterState.Idle);
            return;
        }

        if (recordedChunks.current.length > 0) {
            // Combine chunks into a single Blob for transcription
            const blob = new Blob(recordedChunks.current, { type: mediaRecorder.current?.mimeType || 'audio/webm' });

            if (blob.size === 0) {
                console.warn('⚠️ Skipping: Empty audio blob');
                setCharacterState(CharacterState.Idle);
                return;
            }

            // Create a File object so we can upload it via FormData
            const file = new File([blob], 'recording.webm', { type: blob.type });
            // console.log(blob.type); // should be audio/webm or audio/ogg
            // console.log(blob.size); // should be > 0
            recordedChunks.current = [];

            // console.log('🚀 ~ stopRecording ~ file:', file.type);
            // Switch to speaking state while we send the file and await transcription
            setCharacterState(CharacterState.Speaking);
            await recognize(file);
        } else {
            console.error('No audio data recorded.');
            setCharacterState(CharacterState.Idle);
        }
    };

    // Send the recorded audio file to our transcription API and invoke callback with the result
    const recognize = async (file: File) => {
        // Skip empty recordings
        if (file.size === 0) {
            console.warn('Audio file is empty. Skipping transcription.');
            return;
        }

        // Prepare form data for our API endpoint
        const formData = new FormData();
        formData.append('file', file);

        // If debug mode, include extra flag to API for logging
        if (isDebugMode) {
            formData.append('debug', isDebugMode.toString());
        }
        try {
            // Indicate transcription is in progress
            setIsTranscribing(true);
            // Call our internal transcription API route
            const response = await axios.post('/api/v1/transcribe', formData);

            const data = response.data;
            // Extract and trim the transcript, then run the callback
            const transcript = data.transcription?.trim();
            onSpeechFoundCallback.current(transcript);
        } catch (error) {
            // Handle errors from the transcription request
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const data = error.response?.data;
                const message = data?.error || error.message;

                console.error('[Transcribe API Error]', { status, data });
                setErrorMessage(`Transcription failed (${status}): ${message}`);
                throw new Error(`Failed to transcribe audio: ${error.message}`);
            } else {
                console.error('[Transcribe Error]', error);
                setErrorMessage(`Audio unsupported or malformed (${error})`);
            }
        } finally {
            // Done transcribing
            setIsTranscribing(false);
        }
    };
    // Called to toggle between listening and idle, and to stop playback if needed
    const onMicButtonPressed = () => {
        if (stopPlayback) {
            stopPlayback();
        }

        if (characterStateRef.current === CharacterState.Idle) {
            startRecording();
        } else if (characterStateRef.current === CharacterState.Listening) {
            stopRecording();
        }
    };

    // Expose public API of this hook to components
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
