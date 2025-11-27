import { m, AnimatePresence } from 'framer-motion';
import { forwardRef } from 'react';

import Box from '@mui/material/Box';

import { ANIMATION_DURATION, ANIMATION_EASE } from '../constants';

/**
 * Animation variants for view transitions
 */
const variants = {
  enterRight: {
    initial: { x: 50, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 },
  },
  enterLeft: {
    initial: { x: -50, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 50, opacity: 0 },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
};

/**
 * Animated wrapper for view transitions.
 * Use with AnimatePresence for enter/exit animations.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to animate
 * @param {string} props.direction - Animation direction: 'right' | 'left' | 'fade'
 * @param {string} props.viewKey - Unique key for AnimatePresence
 * @param {Object} props.sx - Additional MUI sx styles
 */
export const AnimatedView = forwardRef(
  ({ children, direction = 'right', viewKey, sx, ...other }, ref) => {
    const variant = direction === 'left' ? variants.enterLeft :
                    direction === 'fade' ? variants.fade :
                    variants.enterRight;

    return (
      <Box
        ref={ref}
        component={m.div}
        key={viewKey}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={variant}
        transition={{
          duration: ANIMATION_DURATION,
          ease: ANIMATION_EASE,
        }}
        sx={{
          width: '100%',
          ...sx,
        }}
        {...other}
      >
        {children}
      </Box>
    );
  }
);

AnimatedView.displayName = 'AnimatedView';

/**
 * Container for AnimatePresence with mode="wait"
 * Ensures clean transitions between views
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - AnimatedView components
 */
export function AnimatedViewContainer({ children }) {
  return (
    <AnimatePresence mode="wait">
      {children}
    </AnimatePresence>
  );
}

/**
 * Stagger container for animating multiple items
 */
export const StaggerContainer = forwardRef(
  ({ children, staggerDelay = 0.05, sx, ...other }, ref) => (
    <Box
      ref={ref}
      component={m.div}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={{
        animate: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      sx={sx}
      {...other}
    >
      {children}
    </Box>
  )
);

StaggerContainer.displayName = 'StaggerContainer';

/**
 * Child item for use within StaggerContainer
 */
export const StaggerItem = forwardRef(
  ({ children, sx, ...other }, ref) => (
    <Box
      ref={ref}
      component={m.div}
      variants={{
        initial: { opacity: 0, y: 20 },
        animate: {
          opacity: 1,
          y: 0,
          transition: {
            duration: ANIMATION_DURATION,
            ease: ANIMATION_EASE,
          },
        },
        exit: { opacity: 0, y: -10 },
      }}
      sx={sx}
      {...other}
    >
      {children}
    </Box>
  )
);

StaggerItem.displayName = 'StaggerItem';
