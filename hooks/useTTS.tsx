
'use client';
import { useEffect, useRef } from 'react';

/**
 * Response return by the synthesize method.
 */
export interface SynthesizeResponse {
    /**
     * Encoded audio bytes.
     */
    audioContent: ArrayBuffer;
}

interface AudioProcessCallback {
    (e: Float32Array): void;
}

const useTTS = () => {
    const audioContext = useRef(new AudioContext());
    const processor = useRef(audioContext.current.createScriptProcessor(1024, 1, 1));
    const dest = useRef(audioContext.current.createMediaStreamDestination());
    const delayNode = useRef(audioContext.current.createDelay(170));
    const source = useRef<AudioBufferSourceNode | null>(null);
    const onProcessCallback = useRef<AudioProcessCallback>(() => {});
    const isPlayingRef = useRef(false);

    useEffect(() => {
        processor.current.connect(dest.current);
        delayNode.current.delayTime.value = Number(new URL(window.location.href).searchParams.get('audio_delay') ?? '300') / 1000;
        delayNode.current.connect(audioContext.current.destination);

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (source.current) {
                source.current.stop();
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const handleVisibilityChange = () => {
        if (document.hidden) {
            audioContext.current.suspend().then(() => {
                console.log('audioContext suspended');
            });
        } else {
            audioContext.current.resume().then(() => {
                console.log('audioContext resumed');
            });
        }
    };

    const setOnProcessCallback = (callback: AudioProcessCallback) => {
        onProcessCallback.current = callback;
    };

    const synthesize = async (text: string) => {
        try {
            const response = await fetch('/api/v1/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text }),
            });
            console.log(response);
            if (!response.ok) {
                throw new Error(`Failed to generate speech with status: ${response.status}`);
            }

            const audioContent = await response.arrayBuffer();
            console.log('🚀 ~ synthesize ~ audioContent:', audioContent);

            return audioContent;
        } catch (error) {
            console.error('Error fetching transcription:', error);
            throw error;
        }
    };

    const play = async (audioContent: ArrayBuffer) => {
        try {
            isPlayingRef.current = true;

            const audioBuffer = await audioContext.current.decodeAudioData(audioContent);

            if (source.current) {
                source.current.stop();
                source.current.disconnect();
            }

            source.current = audioContext.current.createBufferSource();
            source.current.buffer = audioBuffer;

            // Ensure the source is connected to the processor and also directly to the destination.
            source.current.connect(processor.current);
            processor.current.connect(audioContext.current.destination); // Ensure processor routes to destination
            source.current.connect(audioContext.current.destination); // Also connect source directly to destination

            // Set up the audio process event for animations
            processor.current.onaudioprocess = (e) => {
                const audioData = e.inputBuffer.getChannelData(0);
                onProcessCallback.current(audioData); // Trigger the callback that can be linked to your animation
            };

            source.current.start();
            source.current.onended = () => {
                isPlayingRef.current = false;
                try {
                    processor.current?.disconnect();
                } catch (e) {
                    console.warn('[useTTS] Error disconnecting processor in onended:', e);
                }

                try {
                    source.current?.disconnect();
                } catch (e) {
                    console.warn('[useTTS] Error disconnecting source in onended:', e);
                }

                source.current = null;
                console.log('[useTTS] Playback finished.');
            };
        } catch (error) {
            console.error('Error playing audio:', error);
        }
    };
    const stopPlayback = () => {
        if (source.current) {
            try {
                source.current.stop(0);
            } catch (e) {
                console.warn('[useTTS] Audio already stopped:', e);
            }

            try {
                source.current.disconnect();
            } catch (e) {
                console.warn('[useTTS] Disconnect error:', e);
            }

            source.current = null;
        }

        try {
            processor.current?.disconnect();
        } catch (e) {
            console.warn('[useTTS] Processor disconnect error:', e);
        }

        isPlayingRef.current = false;
        console.log('[useTTS] stopPlayback executed');
    };

    const convert = async (text: string) => {
        if (!text) {
            return;
        }

        try {
            const audioContent = await synthesize(text);
            await play(audioContent);
        } catch (error) {
            console.error('Error processing text-to-speech:', error);
        }
    };
    return {
        convert,
        play,
        stopPlayback,
        setOnProcessCallback,
        isPlayingRef,
    };
};

export default useTTS;
