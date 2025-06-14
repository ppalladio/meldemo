/**
 * README: useSVG Hook
 *
 * Loads an external SVG file into a container element and provides maps of
 * group and path elements by their IDs for further manipulation.
 * Exposes:
 *   - SVGRef: a ref to attach to a <div> for rendering the SVG.
 *   - isReady: boolean that becomes true when SVG loading is complete.
 *   - groupsById: map of <g> group IDs to SVG.js group objects.
 *   - pathsById: map of <path> IDs to native SVGPathElement nodes.
 *   - draw: the SVG.js instance for advanced operations.
 */
'use client';

// SVG.js types and utilities for parsing and manipulating SVG content
import { G, List, SVG, Svg, Element as SVGJSElement } from '@svgdotjs/svg.js';
// React hooks for refs, state, and side-effects
import { useEffect, useRef, useState } from 'react';

// Props for the SVG hook: the URL or path to fetch SVG content from
interface UseSVGProps {
  src: string;
}

// Hook to load an SVG into a container div and collect its element maps when ready
export function useSVG({ src }: UseSVGProps) {
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
      // Clear any previous SVG content
      containerRef.current.innerHTML = '';
      // Create a new SVG.js instance in the container
      currentInstance = SVG().addTo(containerRef.current).size('100%', '100%');

      try {
        // Fetch the raw SVG file text
        const res = await fetch(src);
        if (!res.ok) {
          throw new Error(`Failed to fetch SVG: ${res.status} ${res.statusText}`);
        }
        const svgText = await res.text();
        // Render the fetched SVG content
        currentInstance.svg(svgText);
        setDraw(currentInstance);

        // Optionally set the viewbox or resize after loading
        currentInstance.viewbox(0, 0, 2781, 3297).size('100%', '100%');

        // Collect <g> group elements by their ID
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

        // Collect <path> elements by ID for morph targets
        const pathMap: Record<string, SVGPathElement> = {};
        currentInstance.find('path[id]').forEach((el: SVGJSElement) => {
          const id = el.attr('id');
          const node = el.node as SVGPathElement;
          if (id && node instanceof SVGPathElement) {
            pathMap[id] = node;
          }
        });
        setPathsById(pathMap);

        setIsReady(true);
      } catch (error) {
        console.error('Error initializing SVG:', error);
        // Reset state on error
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
      // Clean up on unmount
      if (currentInstance) {
        currentInstance.remove();
      }
      setIsReady(false);
      setGroupsById({});
      setPathsById({});
      setDraw(null);
    };
  }, [src]);

  return {
    SVGRef: containerRef,
    isReady,
    groupsById,
    pathsById,
    draw,
  };
}
