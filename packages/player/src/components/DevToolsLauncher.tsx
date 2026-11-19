import { lazy, Suspense, useEffect, useState } from 'react';

const DevTools = import.meta.env.DEV
  ? lazy(() =>
      import('./DevTools').then((module) => ({ default: module.DevTools })),
    )
  : null;

const isDevToolsShortcut = (event: KeyboardEvent): boolean =>
  (event.ctrlKey || event.metaKey) && event.shiftKey && event.code === 'KeyD';

export const DevToolsLauncher = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isDevToolsShortcut(event)) {
        setIsLoaded(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          code: 'KeyD',
          key: 'D',
          ctrlKey: true,
          shiftKey: true,
        }),
      );
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isLoaded]);

  if (!DevTools || !isLoaded || import.meta.env.MODE === 'test') {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <DevTools />
    </Suspense>
  );
};
