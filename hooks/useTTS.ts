/**
 * README: useTTS Hook
 *
 * A React hook that converts text into speech by calling the /api/v1/tts endpoint
 * and plays the returned audio in the browser. It also lets you monitor playback
 * audio data frames (for visualizations) and stop playback on demand.
 *
 * Exposed functions:
 *   - convert(text): synthesize and play speech for the given text.
 *   - play(audioBuffer): directly play raw audio bytes and forward PCM data.
 *   - stopPlayback(): immediately stop any playing speech.
 *   - setOnProcessCallback(cb): register a callback to receive audio samples.
 *   - isPlaying: boolean flag indicating if speech is in progress.
 */
'use client';

// React hooks for lifecycle, refs, and component state
import { useEffect, useRef, useState } from 'react';

// Interface for raw synthesize response (unused directly here)
export interface SynthesizeResponse {
    audioContent: ArrayBuffer;
}

// Callback to receive audio data chunks during playback (e.g., for visualization)
type AudioProcessCallback = (e: Float32Array) => void;

// Hook to synthesize text with TTS API, play audio, and report playback progress
const useTTS = () => {
    const audioContext = useRef<AudioContext | null>(null);
    const processor = useRef<ScriptProcessorNode | null>(null);
    const source = useRef<AudioBufferSourceNode | null>(null);
    const onProcessCallback = useRef<AudioProcessCallback>(() => {});
    const isPlayingRef = useRef(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Create AudioContext and processor node when component mounts, and clean up on unmount
    useEffect(() => {
        if (typeof window === 'undefined') return;

        audioContext.current = new AudioContext();
        processor.current = audioContext.current.createScriptProcessor(1024, 1, 1);
        processor.current.connect(audioContext.current.destination);

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            processor.current?.disconnect();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            audioContext.current?.close();
        };
    }, []);

    // Pause/resume audio context when the tab becomes hidden or visible
    const handleVisibilityChange = () => {
        if (!audioContext.current) return;
        if (document.hidden) audioContext.current.suspend();
        else audioContext.current.resume();
    };

    // Register a callback to receive audio PCM data during playback
    const setOnProcessCallback = (callback: AudioProcessCallback) => {
        onProcessCallback.current = callback;
    };

    // Call the TTS API to synthesize speech from text, returning ArrayBuffer of audio data
    const synthesize = async (text: string) => {
        const res = await fetch('/api/v1/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });

        if (!res.ok) throw new Error(`TTS failed (${res.status})`);
        return await res.arrayBuffer();
    };

    // Play raw audio data by decoding buffer and routing through processor for visualization
    const play = async (audioContent: ArrayBuffer) => {
        if (!audioContext.current || !processor.current) return;

        const buffer = await audioContext.current.decodeAudioData(audioContent);
        // Stop any previous source before creating new one
        if (source.current) source.current.stop();

        const src = audioContext.current.createBufferSource();
        src.buffer = buffer;
        src.connect(processor.current);
        src.connect(audioContext.current.destination);

        // Forward PCM data to the registered callback for each audio processing event
        processor.current.onaudioprocess = (e) => {
            const data = e.inputBuffer.getChannelData(0);
            onProcessCallback.current(data);
        };

        isPlayingRef.current = true;
        setIsSpeaking(true);
        source.current = src;

        src.start();
        src.onended = () => {
            // Reset state and disconnect nodes when playback finishes
            isPlayingRef.current = false;
            setIsSpeaking(false);
            processor.current?.disconnect();
            src.disconnect();
            source.current = null;
        };
    };

    // Stop any current audio playback immediately
    const stopPlayback = () => {
        source.current?.stop();
        source.current?.disconnect();
        processor.current?.disconnect();
        isPlayingRef.current = false;
        setIsSpeaking(false);
    };

    // Public API: convert text to speech, control playback, and monitor progress
    return {
        convert: async (text: string) => {
            if (!text) return;
            const content = await synthesize(text);
            await play(content);
        },
        play,
        stopPlayback,
        setOnProcessCallback,
        isPlaying: isSpeaking,
    };
};

export default useTTS;
