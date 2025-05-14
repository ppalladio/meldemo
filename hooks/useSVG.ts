'use client';

import { G, List, SVG, Svg, Element as SVGJSElement } from '@svgdotjs/svg.js'; // Added List and SVGJSElement for typing
import { useEffect, useRef, useState } from 'react';
interface UseSVGProps {
    src: string;
    hiddenIds: string[];
}
export function useSVG({ src, hiddenIds }: UseSVGProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isReady, setIsReady] = useState(false);
    const [groupsById, setGroupsById] = useState<Record<string, G>>({});
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

                // Correctly handle the types for elements found by ID
                const foundElements: List<SVGJSElement> = currentInstance.find('g'); // find('g') returns List<Element>
                const idMap: Record<string, G> = {};

                foundElements.forEach((element: SVGJSElement) => {
                    // Since we specifically queried for 'g', we can be reasonably sure
                    // that these elements are SVG group elements.
                    // We perform a cast to G here.
                    // For extreme safety, you could add a runtime check like: if (element instanceof G)
                    const groupElement = element as G;
                    const id = groupElement.attr('id');
                    if (id) {
                        idMap[id] = groupElement;
                    }
                });

                setGroupsById(idMap);

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
            setDraw(null);
        };
    }, [src, hiddenIds]);

    return {
        SVGRef: containerRef,
        isReady,
        groupsById,
        draw,
    };
}
