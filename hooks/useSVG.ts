'use client';

import { G, SVG, Svg } from '@svgdotjs/svg.js';
import { useEffect, useRef, useState } from 'react';

export function useSVG(src: string, hiddenIds: string[] = []) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isReady, setIsReady] = useState(false);
    const [groupsById, setGroupsById] = useState<Record<string, G>>({});
    const [draw, setDraw] = useState<Svg | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const init = async () => {
            const res = await fetch(src);
            const svgText = await res.text();

            const drawInstance = SVG().addTo(containerRef.current!).size('100%', '100%');
            await drawInstance.svg(svgText);
            setDraw(drawInstance);

            const allGroups = drawInstance.find('g');
            const idMap: Record<string, G> = {};

            allGroups.forEach((el) => {
                const group = el as G;
                const id = group.attr('id');
                if (id) {
                    idMap[id] = group;
                }
            });

            // Apply initial visibility
            drawInstance.find('[id]').forEach((el) => {
                const id = el.attr('id');
                if (id && hiddenIds.includes(id)) {
                    el.hide();
                } else {
                    el.show();
                }
            });

            setGroupsById(idMap);
            setIsReady(true);
        };

        init();
    }, [src, hiddenIds]); // make sure it re-runs if hiddenIds change

    return {
        SVGRef: containerRef,
        isReady,
        groupsById,
        draw,
    };
}
