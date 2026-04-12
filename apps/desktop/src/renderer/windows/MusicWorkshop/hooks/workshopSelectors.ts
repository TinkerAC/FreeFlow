import { createSelector } from '@reduxjs/toolkit';
import { DEFAULT_SEPOLIA_CONTRACTS } from '@src/shared/web3/freeflowContracts';
import { filteredReleases } from '../workshopHelpers';
import type { MusicWorkshopRootState } from './workshopStore';
import type { EffectiveWeb3Settings } from './workshopThunks';

export const selectWorkshopState = (state: MusicWorkshopRootState) => state.workshop;

export const selectVisibleReleases = createSelector(
  [selectWorkshopState],
  (workshop) => filteredReleases(workshop.dashboard.releases, workshop.releaseFilter),
);

export const selectEffectiveWeb3Settings = createSelector(
  [selectWorkshopState],
  (workshop): EffectiveWeb3Settings => ({
    chainId: workshop.selectedRelease?.platformDeployment?.chainId ?? DEFAULT_SEPOLIA_CONTRACTS.chainId,
    chainName: workshop.selectedRelease?.platformDeployment?.chainName ?? DEFAULT_SEPOLIA_CONTRACTS.chainName,
    explorerUrl: DEFAULT_SEPOLIA_CONTRACTS.explorerUrl,
    musicAssetAddress: workshop.selectedRelease?.platformDeployment?.musicAssetAddress ?? DEFAULT_SEPOLIA_CONTRACTS.musicAssetAddress,
    royaltySplitterFactoryAddress: workshop.selectedRelease?.platformDeployment?.royaltySplitterFactoryAddress
      ?? DEFAULT_SEPOLIA_CONTRACTS.royaltySplitterFactoryAddress,
    platformHubAddress: workshop.selectedRelease?.platformDeployment?.platformHubAddress ?? DEFAULT_SEPOLIA_CONTRACTS.platformHubAddress,
    defaultRoyaltyBps: DEFAULT_SEPOLIA_CONTRACTS.defaultRoyaltyBps,
    platformFeeBps: DEFAULT_SEPOLIA_CONTRACTS.platformFeeBps,
  }),
);
