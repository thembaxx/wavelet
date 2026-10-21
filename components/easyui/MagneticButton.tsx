'use client';

// Adapted from EasyUI MagneticButton by Suraj Maurya (MIT).
// https://github.com/Surajmaurya1/easyui/blob/main/src/components/ui/MagneticButton.tsx
// Retains Wavelet button styling; only fine-pointer input activates the magnetic spring.
import { useRef } from 'react';
import { motion, useSpring } from 'motion/react';

export type MagneticButtonProps = React.ComponentProps<typeof motion.button> & {
  strength?: number;
  reducedMotion?: boolean;
};

export function MagneticButton({
  strength = 0.14,
  reducedMotion = false,
  disabled,
  onPointerMove,
  onPointerLeave,
  onPointerCancel,
  onBlur,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useSpring(0, { stiffness: 280, damping: 22 });
  const y = useSpring(0, { stiffness: 280, damping: 22 });
  const reset = () => { x.set(0); y.set(0); };

  return (
    <motion.button
      {...props}
      ref={ref}
      type="button"
      disabled={disabled}
      style={{ x, y }}
      onPointerMove={event => {
        onPointerMove?.(event);
        if (event.pointerType !== 'mouse' || reducedMotion || disabled || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        x.set(Math.max(-10, Math.min(10, (event.clientX - rect.left - rect.width / 2) * strength)));
        y.set(Math.max(-8, Math.min(8, (event.clientY - rect.top - rect.height / 2) * strength)));
      }}
      onPointerLeave={event => { onPointerLeave?.(event); reset(); }}
      onPointerCancel={event => { onPointerCancel?.(event); reset(); }}
      onBlur={event => { onBlur?.(event); reset(); }}
      whileHover={reducedMotion || disabled ? undefined : { scale: 1.025 }}
      whileTap={reducedMotion || disabled ? undefined : { scale: 0.975 }}
    />
  );
}
