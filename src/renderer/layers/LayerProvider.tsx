import React, { createContext, useContext} from 'react';
import { createPortal } from 'react-dom';

type Slots = 'dock' | 'drawer' | 'modal' | 'toast';

const Ctx = createContext<Record<Slots, HTMLElement> | null>(null);

export function LayerPortal({ slot, children }: { slot: Slots; children: React.ReactNode }) {
  const ctx = useContext(Ctx);
  if (!ctx) return null;
  const target = ctx[slot];
  return createPortal(<div style={{ pointerEvents: 'auto' }}>{children}</div>, target);
}
