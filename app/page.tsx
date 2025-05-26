'use client';

import useTTS from '@/hooks/useTTS';
import Character from './components/Character';
import Dialog from './components/Dialog';

export default function Home() {
    const tts = useTTS();

    return (
        <div className="flex min-h-screen flex-col items-center justify-center">
            <Character isSpeaking={tts.isPlaying} />
            <Dialog {...tts} />
        </div>
    );
}
