'use client';

import { useSVG } from '@/hooks/useSVG';
import { useMemo } from 'react'; // Import useMemo

const Character = () => {
    // hiddenIds will now have a stable reference unless its dependencies (none here) change.
    const hiddenIds = useMemo(() => ['right_eye_halfopen', 'right_blink', 'neutral_mouth', 'half_open_mouth', 'left_blink', 'left_eye_halfopen'], []); // Empty dependency array means it's created once

    // Removed isReady and groupsById if they are not used directly in this simplified Character component
    const { SVGRef } = useSVG({ src: '/Mel.svg', hiddenIds });

    return <div ref={SVGRef} className="w-full h-[300px] flex items-center justify-center" />;
};

export default Character;
