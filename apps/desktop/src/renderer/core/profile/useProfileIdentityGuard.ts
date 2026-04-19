import React from 'react';
import { useSetting } from '@renderer/core/config/SettingsContext';
import { profileContext } from '@renderer/core/electronContextApi';
import { useWeb25SessionState } from '@renderer/core/web25/auth';
import { clearWeb25SessionSnapshots } from '@renderer/core/web25/sessionSync';
import type { ProfileSummary } from '@src/shared/profile/profile';
import {
  formatShortAddress,
  getProfileWalletAddress,
  getSessionAddress,
  sessionMatchesProfile,
} from './profileIdentity';

export function useProfileIdentityGuard(): void {
  const web25BaseUrl = useSetting<string>('services.web25Backend.baseUrl', 'http://localhost:8787');
  const { session, refresh } = useWeb25SessionState(web25BaseUrl.value);
  const [activeProfile, setActiveProfile] = React.useState<ProfileSummary | null>(null);
  const lastGuardKeyRef = React.useRef('');

  React.useEffect(() => {
    let cancelled = false;
    void profileContext.getActiveProfile()
      .then((profile) => {
        if (!cancelled) setActiveProfile(profile);
      })
      .catch(() => {
        if (!cancelled) setActiveProfile(null);
      });
    void refresh().catch(() => {
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  React.useEffect(() => {
    if (!activeProfile?.walletAddress) return;

    const profileAddress = getProfileWalletAddress(activeProfile);
    const sessionAddress = getSessionAddress(session);

    let reason = '';
    if (session && !sessionMatchesProfile(activeProfile, session)) {
      clearWeb25SessionSnapshots('current-profile');
      reason = `Profile ${formatShortAddress(profileAddress)} 与 SIWE ${formatShortAddress(sessionAddress)} 不一致`;
    }

    if (!reason) {
      lastGuardKeyRef.current = '';
      return;
    }

    const guardKey = `${activeProfile.id}:${sessionAddress}:${reason}`;
    if (lastGuardKeyRef.current === guardKey) return;
    lastGuardKeyRef.current = guardKey;

    console.warn(`[FreeFlow] Profile identity mismatch: ${reason}`);
    void profileContext.exitToGuide();
  }, [activeProfile, session]);
}
