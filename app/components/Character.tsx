'use client';

import { useEyesAnimation } from '@/hooks/useEyesAnimation';
import { useMouthAnimation } from '@/hooks/useMouthAnimation';
import { useSVG } from '@/hooks/useSVG';
import { useEffect } from 'react';

interface CharacterProps {
    readonly isSpeaking: boolean;
}

export default function Character({ isSpeaking }: CharacterProps) {
    const { SVGRef, isReady, pathsById } = useSVG({ src: '/Mel.svg' });

    useEyesAnimation({ isReady, pathsById });
    useMouthAnimation({ isReady, pathsById, isSpeaking });
    useEffect(() => {
        console.log('[Character] isSpeaking:', isSpeaking);
    }, [isSpeaking]);

    const xOffset = 120;
    const yOffset = 100;

    return (
        <div className="w-[400px] h-[400px] flex items-center justify-center">
            <div
                ref={SVGRef}
                className="w-full h-full"
                style={{
                    transform: `translateX(${xOffset}px) translateY(${yOffset}px) scale(1.5)`,
                }}
            />
        </div>
    );
}
