// hooks/useCharacterAnimation.ts
import { gsap } from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { useEffect } from 'react';

gsap.registerPlugin(MorphSVGPlugin);
interface UseCharacterAnimationProps {
    isReady: boolean;
    pathsById: Record<string, SVGPathElement>;
}
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

export function useCharacterAnimation({ isReady, pathsById }: UseCharacterAnimationProps) {
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
            console.log(paths);
            if (!paths.lid.open || !paths.lid.close || !paths.lash.open || !paths.lash.close) {
                console.warn(`Missing required morph paths for eye: ${openLidId}`);
                return null;
            }

            const lidClone = paths.lid.open.cloneNode(true) as SVGPathElement;
            const lashClone = paths.lash.open.cloneNode(true) as SVGPathElement;

            lidClone.setAttribute('id', lidCloneId);
            lashClone.setAttribute('id', lashCloneId);
            lidClone.setAttribute('d', paths.lid.open.getAttribute('d')!);
            lashClone.setAttribute('d', paths.lash.open.getAttribute('d')!);
            lidClone.setAttribute('fill', '#FBF5C0');

            paths.lid.open.parentElement?.appendChild(lidClone);
            paths.lash.open.parentElement?.appendChild(lashClone);
            Object.values(paths.lid).forEach((p) => p?.setAttribute('visibility', 'hidden'));
            Object.values(paths.lash).forEach((p) => p?.setAttribute('visibility', 'hidden'));

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

        if (!leftEye || !rightEye) return;

        const blink = () => {
            const tl = gsap.timeline();

            const closeDuration = Math.random() * 0.1 + 0.25;
            const minOpenDelay = 1.2;
            const maxOpenDelay = 2.2;
            const openDelay = Math.random() * (maxOpenDelay - minOpenDelay) + minOpenDelay;
            //  change semi open probabilities
            const useSemi = leftEye.lid.semi && rightEye.lid.semi && leftEye.lash.semi && rightEye.lash.semi && Math.random() === 1;
            const lidCloseTargetL = useSemi ? leftEye.lid.semi! : leftEye.lid.close;
            const lidCloseTargetR = useSemi ? rightEye.lid.semi! : rightEye.lid.close;
            const lashCloseTargetL = useSemi ? leftEye.lash.semi! : leftEye.lash.close;
            const lashCloseTargetR = useSemi ? rightEye.lash.semi! : rightEye.lash.close;

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

        blink();
    }, [isReady, pathsById]);
}
