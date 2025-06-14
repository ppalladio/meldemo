/**
 * README: useMouthAnimation Hook
 *
 * A React hook that animates an SVG character's mouth while speaking.
 * It clones the open/closed mouth shapes, hides the originals,
 * and continuously morphs between closed and open shapes when the
 * speaking flag is true, creating a talking animation loop.
 */
// Import GSAP animation library and the MorphSVG plugin for morphing shapes
import { gsap } from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
// React hook to run side-effects when component mounts or updates
import { useEffect } from 'react';

// Register the MorphSVG plugin so GSAP can use it
gsap.registerPlugin(MorphSVGPlugin);

// Props for the mouth animation hook: SVG paths readiness, path elements map, and speaking state
interface UseMouthAnimationProps {
    isReady: boolean;
    pathsById: Record<string, SVGPathElement>;
    isSpeaking: boolean;
}

// Hook that animates the mouth shape when speaking and resets on cleanup
export function useMouthAnimation({ isReady, pathsById, isSpeaking }: UseMouthAnimationProps) {
    useEffect(() => {
        if (!isReady) return;

        // Grab the SVG path elements for open/closed lips and mouth interior
        const lipsOpen = pathsById['open_mouth_lips'];
        const lipsClosed = pathsById['neutral_mouth_lips'];
        const ringOpen = pathsById['open_mouth_skin'];
        const ringClosed = pathsById['neutral_mouth_skin'];
        const inside = pathsById['open_mouth_inside'];

        // If any required mouth shapes are missing, skip animation
        if (!lipsOpen || !lipsClosed || !ringOpen || !ringClosed || !inside) {
            console.warn('mouth paths missing');
            return;
        }

        // Clone the open-state shapes for independent morphing
        const strokeClone = lipsOpen.cloneNode(true) as SVGPathElement;
        const ringClone = ringOpen.cloneNode(true) as SVGPathElement;

        // Assign IDs to cloned nodes so we can target them in the animation
        strokeClone.id = 'morphMouthStroke';
        ringClone.id = 'morphMouthRing';

        // Apply initial styling to the cloned lip outline
        strokeClone.setAttribute('fill', 'none');
        strokeClone.setAttribute('stroke', '#DA9562');
        strokeClone.setAttribute('stroke-width', '5');

        // Apply initial styling to the cloned mouth interior shape
        ringClone.setAttribute('fill', '#FBF5C0');
        ringClone.setAttribute('stroke', 'none');

        // Insert clones next to the original shapes and hide originals
        const parent = ringOpen.parentElement!;
        parent.appendChild(ringClone);
        parent.appendChild(strokeClone);
        [lipsOpen, lipsClosed, ringOpen, ringClosed].forEach((p) => p.setAttribute('visibility', 'hidden'));
        gsap.set(ringClone, { morphSVG: ringClosed, opacity: 1 });
        gsap.set(strokeClone, { morphSVG: lipsClosed });

        // Timeline for repeating mouth movement when speaking
        let tl: gsap.core.Timeline | null = null;

        if (isSpeaking) {
            // Create an infinite loop timeline for mouth movement
            tl = gsap.timeline({ repeat: -1 });

            const animateMouth = () => {
                // Randomize how fast the mouth opens and closes
                const duration = 0.15 + Math.random() * 0.1;
                // Small pause between mouth movements
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

            // Start the mouth movement loop
            animateMouth();
        }

        return () => {
            // Clean up: stop animation and restore original shapes
            tl?.kill();
            strokeClone.remove();
            ringClone.remove();
            [lipsOpen, lipsClosed, ringOpen, ringClosed].forEach((p) => p.setAttribute('visibility', 'visible'));
        };
    }, [isReady, pathsById, isSpeaking]);
}
