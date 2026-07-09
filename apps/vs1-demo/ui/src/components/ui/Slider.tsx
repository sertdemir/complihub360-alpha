import React, { useCallback, useId, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

// ─── Slider ────────────────────────────────────────────────────────────────────
// Mirrors the Compass "Slider" component set (539:110). Track (unfilled) =
// neutral-200 / dark white-10, filled track = bg/brand (petrol), thumb = white
// surface with a 2px brand-strong ring. Single + range, keyboard + pointer
// drag, focus ring. Sizes sm·md·lg. Light + dark.
//
// GOTCHA: token-color opacity is broken, so the unfilled track uses the static
// `bg-neutral-200 dark:bg-white/10`. Heights are explicit px (Tailwind h-* maps
// to the wrong scale in this repo).

export type SliderSize = 'sm' | 'md' | 'lg';

const SZ: Record<SliderSize, { track: number; thumb: number }> = {
  sm: { track: 4, thumb: 16 },
  md: { track: 6, thumb: 18 },
  lg: { track: 8, thumb: 24 },
};

export interface SliderProps {
  value?: number | [number, number];
  defaultValue?: number | [number, number];
  onChange?: (v: number | [number, number]) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: SliderSize;
  disabled?: boolean;
  range?: boolean;
  showValue?: boolean;
  id?: string;
  className?: string;
  'aria-label'?: string;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function roundToStep(n: number, min: number, step: number) {
  const stepped = Math.round((n - min) / step) * step + min;
  // avoid fp noise like 0.30000000000000004
  const decimals = (String(step).split('.')[1] || '').length;
  return decimals ? Number(stepped.toFixed(decimals)) : stepped;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  defaultValue,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  size = 'md',
  disabled = false,
  range = false,
  showValue = false,
  id,
  className,
  'aria-label': ariaLabel,
}) => {
  const reactId = useId();
  const baseId = id ?? reactId;
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<0 | 1 | null>(null);
  const sz = SZ[size];

  // Normalise to a tuple internally; single mode uses [min, v].
  const toTuple = (v: number | [number, number] | undefined): [number, number] => {
    if (Array.isArray(v)) return v;
    if (typeof v === 'number') return [min, v];
    return range ? [min, max] : [min, min];
  };

  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<[number, number]>(() =>
    toTuple(isControlled ? value : defaultValue),
  );
  const current = isControlled ? toTuple(value) : internal;

  const emit = useCallback(
    (next: [number, number]) => {
      if (!isControlled) setInternal(next);
      onChange?.(range ? next : next[1]);
    },
    [isControlled, onChange, range],
  );

  const pct = (n: number) => ((n - min) / (max - min)) * 100;

  // For single mode only the second thumb is active; fill runs min→thumb.
  const lo = range ? Math.min(current[0], current[1]) : min;
  const hi = range ? Math.max(current[0], current[1]) : current[1];
  const fillLeft = range ? pct(lo) : 0;
  const fillWidth = range ? pct(hi) - pct(lo) : pct(current[1]);

  const setThumb = (idx: 0 | 1, raw: number) => {
    const v = clamp(roundToStep(raw, min, step), min, max);
    const next: [number, number] = [...current];
    next[idx] = v;
    if (range) {
      // keep thumbs ordered without swapping identity
      if (idx === 0) next[0] = Math.min(v, next[1]);
      else next[1] = Math.max(v, next[0]);
    } else {
      next[1] = v;
    }
    emit(next);
  };

  const valueFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return min;
    const rect = el.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return min + ratio * (max - min);
  };

  const onPointerDown = (idx: 0 | 1) => (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragging.current = idx;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (disabled || dragging.current === null) return;
    setThumb(dragging.current, valueFromClientX(e.clientX));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragging.current === null) return;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    dragging.current = null;
  };

  // Click on the track jumps the nearest thumb.
  const onTrackPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    const v = valueFromClientX(e.clientX);
    let idx: 0 | 1 = 1;
    if (range) {
      idx = Math.abs(v - current[0]) <= Math.abs(v - current[1]) ? 0 : 1;
    }
    dragging.current = idx;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setThumb(idx, v);
  };

  const onKeyDown = (idx: 0 | 1) => (e: React.KeyboardEvent) => {
    if (disabled) return;
    const cur = idx === 0 ? current[0] : current[1];
    let next: number | null = null;
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        next = cur - step;
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        next = cur + step;
        break;
      case 'PageDown':
        next = cur - step * 10;
        break;
      case 'PageUp':
        next = cur + step * 10;
        break;
      case 'Home':
        next = min;
        break;
      case 'End':
        next = max;
        break;
      default:
        return;
    }
    e.preventDefault();
    setThumb(idx, next);
  };

  const thumbBase = cn(
    'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full',
    'bg-surface border-2 transition-shadow',
    disabled
      ? 'border-stroke cursor-not-allowed'
      : 'border-stroke-strong cursor-grab active:cursor-grabbing',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  );

  const renderThumb = (idx: 0 | 1) => {
    const v = idx === 0 ? current[0] : current[1];
    return (
      <div
        key={idx}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={v}
        aria-disabled={disabled || undefined}
        aria-label={ariaLabel}
        id={`${baseId}-thumb-${idx}`}
        onPointerDown={onPointerDown(idx)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown(idx)}
        className={thumbBase}
        style={{ left: `${pct(v)}%`, width: sz.thumb, height: sz.thumb }}
      />
    );
  };

  const label = range ? `${current[0]} – ${current[1]}` : `${current[1]}`;

  return (
    <div className={cn('w-full', disabled && 'opacity-60', className)}>
      {showValue && (
        <div className="mb-2 flex justify-between text-[13px] text-fg-secondary">
          <span className="text-fg-secondary">Value</span>
          <span className="font-medium text-fg">{label}</span>
        </div>
      )}
      <div
        className="relative w-full"
        style={{ height: Math.max(sz.thumb, sz.track) }}
      >
        {/* Track (unfilled) */}
        <div
          ref={trackRef}
          onPointerDown={onTrackPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className={cn(
            'absolute left-0 top-1/2 w-full -translate-y-1/2 rounded-full',
            'bg-neutral-200 dark:bg-white/10',
            !disabled && 'cursor-pointer',
          )}
          style={{ height: sz.track }}
        >
          {/* Fill */}
          <div
            className="absolute top-0 h-full rounded-full bg-brand"
            style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
          />
        </div>
        {range && renderThumb(0)}
        {renderThumb(1)}
      </div>
    </div>
  );
};

Slider.displayName = 'Slider';
