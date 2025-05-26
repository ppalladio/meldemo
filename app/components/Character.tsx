'use client';

import { useEyesAnimation }  from '@/hooks/useEyesAnimation';
import { useMouthAnimation } from '@/hooks/useMouthAnimation';
import { useSVG }            from '@/hooks/useSVG';

export default function Character() {
  const { SVGRef, isReady, pathsById } = useSVG({ src: '/mel.svg' });

  useEyesAnimation({ isReady, pathsById });
  useMouthAnimation({ isReady: true, isSpeaking: true, pathsById });
 
 
  const xOffset =  120;     
  const yOffset =  100;  
  return (
    <div className="w-[400px] h-[400px] flex items-center justify-center">
      <div ref={SVGRef} className="w-full h-full"
           style={{ transform: `translateX(${xOffset}px) translateY(${yOffset}px) scale(1.5)`  }} />
    </div>)
}
