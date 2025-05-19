'use client';

import { useSVG } from '@/hooks/useSVG';
import { gsap } from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { useEffect, useMemo } from 'react';

gsap.registerPlugin(MorphSVGPlugin);

export default function EyeAnimation() {
    const hiddenIds = useMemo(() => ['left_eye_halfopen', 'left_eye_close', 'right_eye_close'], []);

    const { SVGRef, isReady, pathsById } = useSVG({
        src: '/v3_flat_adjusted.svg',
        hiddenIds,
    });

    useEffect(() => {
        if (!isReady) return;

        const createMorphPair = (
            openLidId: string,
            closeLidId: string,
            openLashId: string,
            closeLashId: string,
            lidCloneId: string,
            lashCloneId: string,
        ) => {
            const paths = {
                lid: {
                    open: pathsById[openLidId],
                    close: pathsById[closeLidId],
                },
                lash: {
                    open: pathsById[openLashId],
                    close: pathsById[closeLashId],
                },
            };

            if (!paths.lid.open || !paths.lid.close || !paths.lash.open || !paths.lash.close) {
                console.warn(`Missing morph paths for eye: ${openLidId}`);
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

        const leftEye = createMorphPair(
            'left_eye_open_lid',
            'left_eye_close_lid',
            'left_eye_open_lash',
            'left_eye_close_lash',
            'morphLidLeft',
            'morphLashLeft',
        );

        const rightEye = createMorphPair(
            'right_eye_open_lid',
            'right_eye_close_lid',
            'right_eye_open_lash',
            'right_eye_close_lash',
            'morphLidRight',
            'morphLashRight',
        );

        const tl = gsap.timeline({
            repeat: -1,
            defaults: { duration: 0.4, ease: 'power2.inOut' },
        });

        if (leftEye && rightEye) {
            tl.to(leftEye.lidClone, { morphSVG: leftEye.lid.close }, 0)
                .to(rightEye.lidClone, { morphSVG: rightEye.lid.close }, 0)
                .to(leftEye.lashClone, { morphSVG: leftEye.lash.close }, '<')
                .to(rightEye.lashClone, { morphSVG: rightEye.lash.close }, '<')
                .to(leftEye.lidClone, { morphSVG: leftEye.lid.open }, '+=0.2')
                .to(rightEye.lidClone, { morphSVG: rightEye.lid.open }, '<')
                .to(leftEye.lashClone, { morphSVG: leftEye.lash.open }, '<')
                .to(rightEye.lashClone, { morphSVG: rightEye.lash.open }, '<');
        }
    }, [isReady, pathsById]);

    return (
        <div className="w-[400px] h-[400px] flex items-center justify-center">
            <div ref={SVGRef} className="w-full h-full" />
        </div>
    );
}
