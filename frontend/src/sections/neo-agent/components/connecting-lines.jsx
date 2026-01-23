import { memo, useState, useEffect, useCallback } from 'react';

/**
 * SVG connecting lines between source elements and a target element.
 * Uses container-relative positioning so it works with scrolling.
 * Supports highlighting active line with animation.
 */
export const ConnectingLines = memo(({
  containerRef,
  sourceRefs,
  targetRef,
  dependency,
  activeIndex = null, // Index of the active/expanded accordion
  color = '#e0e0e0',
  activeColor = '#1976d2',
  strokeWidth = 1.5,
  activeStrokeWidth = 2.5,
}) => {
  const [paths, setPaths] = useState([]);

  const updatePaths = useCallback(() => {
    if (!containerRef?.current || !targetRef?.current || !sourceRefs?.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const targetRect = targetRef.current.getBoundingClientRect();

    // Target position relative to container
    const targetX = targetRect.left - containerRect.left;
    const targetY = targetRect.top - containerRect.top + targetRect.height / 2;

    const newPaths = sourceRefs.current
      .map((ref) => {
        if (!ref) return null;
        const rect = ref.getBoundingClientRect();

        // Source position relative to container
        const startX = rect.right - containerRect.left;
        const startY = rect.top - containerRect.top + 28;
        const endX = targetX;
        const endY = targetY;
        const midX = startX + (endX - startX) * 0.5;

        return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
      })
      .filter(Boolean);

    setPaths(newPaths);
  }, [containerRef, sourceRefs, targetRef]);

  // Initial render
  useEffect(() => {
    const timer = setTimeout(updatePaths, 50);
    return () => clearTimeout(timer);
  }, [updatePaths]);

  // Update during accordion animation
  useEffect(() => {
    let animationId;
    const startTime = performance.now();

    const animate = () => {
      updatePaths();
      if (performance.now() - startTime < 300) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [dependency, updatePaths]);

  // Update on window resize and scroll
  useEffect(() => {
    window.addEventListener('resize', updatePaths);
    window.addEventListener('scroll', updatePaths, true);
    return () => {
      window.removeEventListener('resize', updatePaths);
      window.removeEventListener('scroll', updatePaths, true);
    };
  }, [updatePaths]);

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      <defs>
        <linearGradient id="flowingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={activeColor} stopOpacity="0.3">
            <animate attributeName="offset" values="-1;1" dur="1.5s" repeatCount="indefinite" />
          </stop>
          <stop offset="50%" stopColor={activeColor} stopOpacity="1">
            <animate attributeName="offset" values="-0.5;1.5" dur="1.5s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor={activeColor} stopOpacity="0.3">
            <animate attributeName="offset" values="0;2" dur="1.5s" repeatCount="indefinite" />
          </stop>
        </linearGradient>
      </defs>
      {paths.map((d, i) => {
        const isActive = activeIndex === i;
        const isDimmed = activeIndex !== null && !isActive;
        return (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={isActive ? 'url(#flowingGradient)' : color}
            strokeWidth={isActive ? activeStrokeWidth : strokeWidth}
            opacity={isDimmed ? 0.3 : 1}
            style={{ transition: 'opacity 0.3s ease, stroke-width 0.3s ease' }}
          />
        );
      })}
    </svg>
  );
});
