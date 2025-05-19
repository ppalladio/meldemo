'use client';

import { useCharacterAnimation } from '@/hooks/useCharacterAnimation';
import { useSVG } from '@/hooks/useSVG';

export default function EyeAnimation() {
    const { SVGRef, isReady, pathsById } = useSVG({
        src: '/v3_flat_adjusted.svg',
    });

    useCharacterAnimation({ isReady, pathsById });

    return (
        <div className="w-[400px] h-[400px] flex items-center justify-center">
            <div ref={SVGRef} className="w-full h-full" />
        </div>
    );
}
