'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/** `window.location.origin` an toàn với SSR: server trả '' và client cập nhật sau hydrate, không lệch markup. */
export function useOrigin(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.origin,
    () => '',
  );
}
