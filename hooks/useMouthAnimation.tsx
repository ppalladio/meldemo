import { useEffect } from 'react';
import { gsap } from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';

gsap.registerPlugin(MorphSVGPlugin);

interface UseMouthAnimationProps {
  isReady: boolean;
  pathsById: Record<string, SVGPathElement>;
  isSpeaking: boolean;
}

export function useMouthAnimation({
  isReady,
  pathsById,
  isSpeaking,
}: UseMouthAnimationProps) {
  useEffect(() => {
    if (!isReady) return;
	
 
    const lipsOpen   = pathsById['open_mouth_lips'];
    const lipsClosed = pathsById['neutral_mouth_lips'];
    const ringOpen   = pathsById['open_mouth_skin'];
    const ringClosed = pathsById['neutral_mouth_skin'];
    const inside     = pathsById['open_mouth_inside'];   // red fill

    if (!lipsOpen || !lipsClosed || !ringOpen || !ringClosed || !inside) {
      console.warn('❌  mouth paths missing');
      return;
    }
 
    const strokeClone = lipsOpen.cloneNode(true)  as SVGPathElement;
    const ringClone   = ringOpen.cloneNode(true)  as SVGPathElement;

    strokeClone.id = 'morphMouthStroke';
    ringClone.id   = 'morphMouthRing';
 
    strokeClone.setAttribute('fill', 'none');
    strokeClone.setAttribute('stroke', '#DA9562');
    strokeClone.setAttribute('stroke-width', '5');
 
    ringClone.setAttribute('fill', '#FBF5C0');
    ringClone.setAttribute('stroke', 'none');
 
    const parent = ringOpen.parentElement!;
    parent.appendChild(ringClone);      
    parent.appendChild(strokeClone);    
    [lipsOpen, lipsClosed, ringOpen, ringClosed].forEach(p =>
      p.setAttribute('visibility', 'hidden')
    );
 
    gsap.set(ringClone,   { morphSVG: ringOpen,   opacity: 0 });
    gsap.set(strokeClone, { morphSVG: lipsOpen });
 
    let tl: gsap.core.Timeline | null = null;

    if (isSpeaking) {
      tl = gsap.timeline({ repeat: -1 });

   
      tl.to(ringClone,   { morphSVG: ringClosed, opacity: 1, duration: 0.25, ease: 'power2.inOut' }, 0)
        .to(strokeClone,{ morphSVG: lipsClosed,               duration: 0.25, ease: 'power2.inOut' }, 0)
        .to({}, { duration: 0.2 })          
 
        .to(ringClone,   { morphSVG: ringOpen,   opacity: 0, duration: 0.25, ease: 'power2.inOut' })
        .to(strokeClone,{ morphSVG: lipsOpen,                duration: 0.25, ease: 'power2.inOut' }, '<')
		
        .to({}, { duration: 0.35 });      
    }
 
    return () => {
      tl?.kill();
      strokeClone.remove();
      ringClone.remove();
      [lipsOpen, lipsClosed, ringOpen, ringClosed].forEach(p =>
        p.setAttribute('visibility', 'visible')
      );
    };
  }, [isReady, pathsById, isSpeaking]);
}
