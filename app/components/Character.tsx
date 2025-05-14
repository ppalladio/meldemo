
'use client';

import { useSVG } from '@/hooks/useSVG';

const Character = () => {
    const hiddenIds = ['right_eye_halfopen', 'right_blink', 'neutral_mouth', 'half_open_mouth', 'left_blink', 'left_eye_halfopen'];

    const { SVGRef, isReady, groupsById } = useSVG('/Mel.svg', hiddenIds);

    return <div ref={SVGRef} className="w-full h-[300px] flex items-center justify-center" />;
};

export default Character;
