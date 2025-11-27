import { useState, useEffect, useCallback, memo } from 'react';

/**
 * SVG connecting lines between source elements and a target element.
 * Uses container-relative positioning so it works with scrolling.
 */
export const ConnectingLines = memo(function ConnectingLines({
  containerRef,
  sourceRefs,
  targetRef,
  dependency,
  color = '#e0e0e0',
  strokeWidth = 1.5,
}) {
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
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={color} strokeWidth={strokeWidth} />
      ))}
    </svg>
  );
});
