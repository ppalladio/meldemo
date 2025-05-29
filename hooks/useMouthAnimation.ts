import { gsap } from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { useEffect } from 'react';

gsap.registerPlugin(MorphSVGPlugin);

interface UseMouthAnimationProps {
    isReady: boolean;
    pathsById: Record<string, SVGPathElement>;
    isSpeaking: boolean;
}

export function useMouthAnimation({ isReady, pathsById, isSpeaking }: UseMouthAnimationProps) {
    useEffect(() => {
        if (!isReady) return;

        const lipsOpen = pathsById['open_mouth_lips'];
        const lipsClosed = pathsById['neutral_mouth_lips'];
        const ringOpen = pathsById['open_mouth_skin'];
        const ringClosed = pathsById['neutral_mouth_skin'];
        const inside = pathsById['open_mouth_inside'];

        if (!lipsOpen || !lipsClosed || !ringOpen || !ringClosed || !inside) {
            console.warn('mouth paths missing');
            return;
        }

        const strokeClone = lipsOpen.cloneNode(true) as SVGPathElement;
        const ringClone = ringOpen.cloneNode(true) as SVGPathElement;

        strokeClone.id = 'morphMouthStroke';
        ringClone.id = 'morphMouthRing';

        strokeClone.setAttribute('fill', 'none');
        strokeClone.setAttribute('stroke', '#DA9562');
        strokeClone.setAttribute('stroke-width', '5');

        ringClone.setAttribute('fill', '#FBF5C0');
        ringClone.setAttribute('stroke', 'none');

        const parent = ringOpen.parentElement!;
        parent.appendChild(ringClone);
        parent.appendChild(strokeClone);
        [lipsOpen, lipsClosed, ringOpen, ringClosed].forEach((p) => p.setAttribute('visibility', 'hidden'));
        gsap.set(ringClone, { morphSVG: ringClosed, opacity: 1 });
        gsap.set(strokeClone, { morphSVG: lipsClosed });

        let tl: gsap.core.Timeline | null = null;

        if (isSpeaking) {
            tl = gsap.timeline({ repeat: -1 });

            const animateMouth = () => {
                // randomize mouth animation
                const duration = 0.15 + Math.random() * 0.1;
                const pause = 0.1 + Math.random() * 0.01;

                tl!
                    .to(ringClone, { morphSVG: ringClosed, opacity: 1, duration: duration, ease: 'power1.inOut' })
                    .to(strokeClone, { morphSVG: lipsClosed, duration: duration, ease: 'power1.inOut' }, `<`)
                    .to({}, { duration: pause })

                    .to(ringClone, { morphSVG: ringOpen, opacity: 0, duration: duration, ease: 'power2.out' })
                    .to(strokeClone, { morphSVG: lipsOpen, duration: duration, ease: 'power2.out' }, `<`)
                    .to(
                        {},
                        {
                            duration: pause,
                            onComplete: animateMouth,
                        },
                    );
            };

            animateMouth();
        }

        return () => {
            tl?.kill();
            strokeClone.remove();
            ringClone.remove();
            [lipsOpen, lipsClosed, ringOpen, ringClosed].forEach((p) => p.setAttribute('visibility', 'visible'));
        };
    }, [isReady, pathsById, isSpeaking]);
}
