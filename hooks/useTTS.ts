'use client';

import { useEffect, useRef, useState } from 'react';

export interface SynthesizeResponse {
    audioContent: ArrayBuffer;
}

type AudioProcessCallback = (e: Float32Array) => void;

const useTTS = () => {
    const audioContext = useRef<AudioContext | null>(null);
    const processor = useRef<ScriptProcessorNode | null>(null);
    const source = useRef<AudioBufferSourceNode | null>(null);
    const onProcessCallback = useRef<AudioProcessCallback>(() => {});
    const isPlayingRef = useRef(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

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

    const handleVisibilityChange = () => {
        if (!audioContext.current) return;
        if (document.hidden) audioContext.current.suspend();
        else audioContext.current.resume();
    };

    const setOnProcessCallback = (callback: AudioProcessCallback) => {
        onProcessCallback.current = callback;
    };

    const synthesize = async (text: string) => {
        const res = await fetch('/api/v1/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });

        if (!res.ok) throw new Error(`TTS failed (${res.status})`);
        return await res.arrayBuffer();
    };

    const play = async (audioContent: ArrayBuffer) => {
        if (!audioContext.current || !processor.current) return;

        const buffer = await audioContext.current.decodeAudioData(audioContent);
        if (source.current) source.current.stop();

        const src = audioContext.current.createBufferSource();
        src.buffer = buffer;
        src.connect(processor.current);
        src.connect(audioContext.current.destination);

        processor.current.onaudioprocess = (e) => {
            const data = e.inputBuffer.getChannelData(0);
            onProcessCallback.current(data);
        };

        isPlayingRef.current = true;
        setIsSpeaking(true);
        source.current = src;

        src.start();
        src.onended = () => {
            isPlayingRef.current = false;
            setIsSpeaking(false);
            processor.current?.disconnect();
            src.disconnect();
            source.current = null;
        };
    };

    const stopPlayback = () => {
        source.current?.stop();
        source.current?.disconnect();
        processor.current?.disconnect();
        isPlayingRef.current = false;
        setIsSpeaking(false);
    };

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
