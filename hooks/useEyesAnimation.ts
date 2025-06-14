/**
 * README: useEyesAnimation Hook
 *
 * A React hook that adds natural blinking to an SVG character's eyes.
 * It clones the open/closed (and optional half-open) eye paths,
 * hides the originals, and then continuously morphs the clones
 * between open and closed shapes at random intervals.
 */
 
// Import GSAP animation library and the MorphSVG plugin for shape morphing
import { gsap } from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
// React hook to run side-effects when component mounts or updates
import { useEffect } from 'react';

// Register the MorphSVG plugin with GSAP (required before using it)
gsap.registerPlugin(MorphSVGPlugin);
// Props that describe when SVG paths are ready and a map of path elements
interface UseEyesAnimationProps {
    isReady: boolean;
    pathsById: Record<string, SVGPathElement>;
}
// Parameters for defining a set of morphing paths (open, closed, and optional semi-open)
type MorphPairParams = {
    openLidId: string;
    closeLidId: string;
    openLashId: string;
    closeLashId: string;
    lidCloneId: string;
    lashCloneId: string;
    semiLidId?: string;
    semiLashId?: string;
};

// Main hook: sets up eye blink animations once SVG elements are loaded
export function useEyesAnimation({ isReady, pathsById }: UseEyesAnimationProps) {
    useEffect(() => {
        if (!isReady) return;

        const createMorphPair = ({
            openLidId,
            closeLidId,
            openLashId,
            closeLashId,
            lidCloneId,
            lashCloneId,
            semiLidId,
            semiLashId,
        }: MorphPairParams) => {
            // Find the SVG path elements for open, closed, and optional half-open states
            const paths = {
                lid: {
                    open: pathsById[openLidId],
                    close: pathsById[closeLidId],
                    semi: semiLidId ? pathsById[semiLidId] : null,
                },
                lash: {
                    open: pathsById[openLashId],
                    close: pathsById[closeLashId],
                    semi: semiLashId ? pathsById[semiLashId] : null,
                },
            };

            // If any required paths are missing, skip this eye
            if (!paths.lid.open || !paths.lid.close || !paths.lash.open || !paths.lash.close) {
                console.warn(`Missing required morph paths for eye: ${openLidId}`);
                return null;
            }

            // Clone the open-state paths to create independent elements we can morph
            const lidClone = paths.lid.open.cloneNode(true) as SVGPathElement;
            const lashClone = paths.lash.open.cloneNode(true) as SVGPathElement;

            // Copy initial path data and styling to the clones
            lidClone.setAttribute('id', lidCloneId);
            lashClone.setAttribute('id', lashCloneId);
            lidClone.setAttribute('d', paths.lid.open.getAttribute('d')!);
            lashClone.setAttribute('d', paths.lash.open.getAttribute('d')!);
            lidClone.setAttribute('fill', '#FBF5C0');

            // Add the clones to the SVG DOM and hide the original paths
            paths.lid.open.parentElement?.appendChild(lidClone);
            paths.lash.open.parentElement?.appendChild(lashClone);
            Object.values(paths.lid).forEach((p) => p?.setAttribute('visibility', 'hidden'));
            Object.values(paths.lash).forEach((p) => p?.setAttribute('visibility', 'hidden'));

            // Return the original and clone elements for animation use
            return { lidClone, lashClone, ...paths };
        };
        const leftEye = createMorphPair({
            openLidId: 'left_eye_open_lid',
            closeLidId: 'left_eye_close_lid',
            openLashId: 'left_eye_open_lash',
            closeLashId: 'left_eye_close_lash',
            lidCloneId: 'morphLidLeft',
            lashCloneId: 'morphLashLeft',
            semiLidId: 'left_eye_halfopen_lid',
            semiLashId: 'left_eye_halfopen_lash',
        });

        const rightEye = createMorphPair({
            openLidId: 'right_eye_open_lid',
            closeLidId: 'right_eye_close_lid',
            openLashId: 'right_eye_open_lash',
            closeLashId: 'right_eye_close_lash',
            lidCloneId: 'morphLidRight',
            lashCloneId: 'morphLashRight',
            semiLidId: 'right_eye_halfopen_lid',
            semiLashId: 'right_eye_halfopen_lash',
        });

        // Stop if we couldn't build either eye morph pair
        if (!leftEye || !rightEye) return;

        // Recursive function that runs the blink animation in a loop
        const blink = () => {
            // Create a new GSAP timeline for this blink cycle
            const tl = gsap.timeline();

            // Determine how long the eyes stay closed (randomized within a small range)
            const closeDuration = Math.random() * 0.1 + 0.25;
            // Determine a random delay before opening the eyes again
            const minOpenDelay = 1.2;
            const maxOpenDelay = 2.2;
            const openDelay = Math.random() * (maxOpenDelay - minOpenDelay) + minOpenDelay;
            //  change semi open probabilities
            // Occasionally use a semi-open (half-blink) shape if available
            const useSemi = leftEye.lid.semi && rightEye.lid.semi && leftEye.lash.semi && rightEye.lash.semi && Math.random() === 1;
            const lidCloseTargetL = useSemi ? leftEye.lid.semi! : leftEye.lid.close;
            const lidCloseTargetR = useSemi ? rightEye.lid.semi! : rightEye.lid.close;
            const lashCloseTargetL = useSemi ? leftEye.lash.semi! : leftEye.lash.close;
            const lashCloseTargetR = useSemi ? rightEye.lash.semi! : rightEye.lash.close;

            // Animate the eyelid paths to the closed target shapes and back to open
            tl.to(leftEye.lidClone, { morphSVG: lidCloseTargetL, duration: closeDuration, ease: 'power2.inOut' }, 0)
                .to(rightEye.lidClone, { morphSVG: lidCloseTargetR, duration: closeDuration, ease: 'power2.inOut' }, 0)
                .to(leftEye.lashClone, { morphSVG: lashCloseTargetL, duration: closeDuration, ease: 'power2.inOut' }, 0)
                .to(rightEye.lashClone, { morphSVG: lashCloseTargetR, duration: closeDuration, ease: 'power2.inOut' }, 0)
                .to(leftEye.lidClone, { morphSVG: leftEye.lid.open, duration: 0.25, ease: 'power2.inOut' }, '+=0.1')
                .to(rightEye.lidClone, { morphSVG: rightEye.lid.open, duration: 0.25, ease: 'power2.inOut' }, '<')
                .to(leftEye.lashClone, { morphSVG: leftEye.lash.open, duration: 0.25, ease: 'power2.inOut' }, '<')
                .to(rightEye.lashClone, { morphSVG: rightEye.lash.open, duration: 0.25, ease: 'power2.inOut' }, '<')
                .to({}, { duration: openDelay })
                .call(blink);
        };

        // Start the blinking loop
        blink();
    }, [isReady, pathsById]);
}
