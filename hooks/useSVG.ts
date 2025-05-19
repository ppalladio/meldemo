'use client';

import { G, List, SVG, Svg, Element as SVGJSElement } from '@svgdotjs/svg.js';
import { useEffect, useRef, useState } from 'react';

interface UseSVGProps {
    src: string;
    hiddenIds: string[];
}

export function useSVG({ src, hiddenIds }: UseSVGProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isReady, setIsReady] = useState(false);
    const [groupsById, setGroupsById] = useState<Record<string, G>>({});
    const [pathsById, setPathsById] = useState<Record<string, SVGPathElement>>({});
    const [draw, setDraw] = useState<Svg | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        let currentInstance: Svg | null = null;

        const init = async () => {
            if (!containerRef.current) return;
            containerRef.current.innerHTML = '';
            currentInstance = SVG().addTo(containerRef.current).size('100%', '100%');

            try {
                const res = await fetch(src);
                if (!res.ok) {
                    throw new Error(`Failed to fetch SVG: ${res.status} ${res.statusText}`);
                }
                const svgText = await res.text();
                currentInstance.svg(svgText);
                setDraw(currentInstance);

                currentInstance.viewbox(0, 0, 2781, 3297).size('100%', '100%');

                const foundGroups: List<SVGJSElement> = currentInstance.find('g');
                const groupMap: Record<string, G> = {};
                foundGroups.forEach((element: SVGJSElement) => {
                    const groupElement = element as G;
                    const id = groupElement.attr('id');
                    if (id) {
                        groupMap[id] = groupElement;
                    }
                });
                setGroupsById(groupMap);

                const pathMap: Record<string, SVGPathElement> = {};
                currentInstance.find('path[id]').forEach((el: SVGJSElement) => {
                    const id = el.attr('id');
                    const node = el.node as SVGPathElement;
                    if (id && node instanceof SVGPathElement) {
                        pathMap[id] = node;
                    }
                });
                setPathsById(pathMap);

                currentInstance.find('[id]').forEach((el: SVGJSElement) => {
                    const id = el.attr('id');
                    if (id) {
                        if (hiddenIds.includes(id)) {
                            el.hide();
                        } else {
                            el.show();
                        }
                    }
                });

                setIsReady(true);
            } catch (error) {
                console.error('Error initializing SVG:', error);
                setIsReady(false);
                setGroupsById({});
                setPathsById({});
                setDraw(null);
                if (currentInstance) {
                    currentInstance.remove();
                }
            }
        };

        init();

        return () => {
            if (currentInstance) {
                currentInstance.remove();
            }
            setIsReady(false);
            setGroupsById({});
            setPathsById({});
            setDraw(null);
        };
    }, [src, hiddenIds]);

    return {
        SVGRef: containerRef,
        isReady,
        groupsById,
        pathsById,
        draw,
    };
}