import { LayerPortal } from '@renderer/layers/LayerProvider';
import { AnimatePresence, motion } from 'framer-motion';
import RightContent from '@components/RightContent/RightContent';
import React from 'react';

export default function RightDrawer({ visible, player }: { visible: boolean; player: any }) {
  return (
    <LayerPortal slot="drawer">
      <AnimatePresence>
        {visible && (
          <motion.aside
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            style={{
              position: 'absolute', right: 0, top: 0, bottom: 0, width: 300,
              background: 'rgb(24 24 27)', borderLeft: '1px solid rgb(63 63 70)',
              boxShadow: '0 10px 30px rgba(0,0,0,.45)',
            }}
          >
            <RightContent player={player}>
            </RightContent>
          </motion.aside>
        )}
      </AnimatePresence>
    </LayerPortal>
  );
}
