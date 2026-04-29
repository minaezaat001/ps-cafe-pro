"use client";

import { useEffect, useCallback } from 'react';

/**
 * useKeyPress — fires callback when a key is pressed.
 * Won't fire Enter when the user is typing in a textarea or select
 * (it WILL fire in number/text inputs so the user can confirm by pressing Enter).
 */
export function useKeyPress(
  key: 'Enter' | 'Escape',
  callback: () => void,
  enabled = true
) {
  const stableCallback = useCallback(callback, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key !== key) return;
      // Don't intercept if modifier keys are held
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const target = e.target as HTMLElement;
      const tag = target.tagName;

      // For Enter: allow firing from inputs (useful for confirm-by-Enter)
      // but not from textarea or select (those need Enter for their own purpose)
      if (key === 'Enter' && (tag === 'TEXTAREA' || tag === 'SELECT')) return;

      e.preventDefault();
      stableCallback();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, enabled, stableCallback]);
}
