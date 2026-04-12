import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  CreatorReleaseDashboard,
  CreatorReleaseRecord,
  PinataConfigPayload,
  Web25Session,
} from '@renderer/core/web25/client';
import {
  type AutosaveState,
  type BusyState,
  EMPTY_DASHBOARD,
  type ReleaseFilter,
  type ReleasePanel,
  replaceReleaseInDashboard,
} from '../workshopHelpers';

export type WorkshopState = {
  dashboard: CreatorReleaseDashboard;
  selectedRelease: CreatorReleaseRecord | null;
  releaseFilter: ReleaseFilter;
  activePanel: ReleasePanel;
  busyState: BusyState;
  autosaveState: AutosaveState;
  authBusy: boolean;
  web25Session: Web25Session | null;
  pinataConfig: PinataConfigPayload | null;
};

const initialState: WorkshopState = {
  dashboard: EMPTY_DASHBOARD,
  selectedRelease: null,
  releaseFilter: 'all',
  activePanel: 'editor',
  busyState: 'idle',
  autosaveState: 'idle',
  authBusy: false,
  web25Session: null,
  pinataConfig: null,
};

const workshopSlice = createSlice({
  name: 'musicWorkshop',
  initialState,
  reducers: {
    setDashboard(state, action: PayloadAction<CreatorReleaseDashboard>) {
      state.dashboard = action.payload;
    },
    setSelectedRelease(state, action: PayloadAction<CreatorReleaseRecord | null>) {
      state.selectedRelease = action.payload;
    },
    setReleaseFilter(state, action: PayloadAction<ReleaseFilter>) {
      state.releaseFilter = action.payload;
    },
    setActivePanel(state, action: PayloadAction<ReleasePanel>) {
      state.activePanel = action.payload;
    },
    setBusyState(state, action: PayloadAction<BusyState>) {
      state.busyState = action.payload;
    },
    setAutosaveState(state, action: PayloadAction<AutosaveState>) {
      state.autosaveState = action.payload;
    },
    setAuthBusy(state, action: PayloadAction<boolean>) {
      state.authBusy = action.payload;
    },
    setWeb25Session(state, action: PayloadAction<Web25Session | null>) {
      state.web25Session = action.payload;
    },
    setPinataConfig(state, action: PayloadAction<PinataConfigPayload | null>) {
      state.pinataConfig = action.payload;
    },
    patchSelectedRelease(state, action: PayloadAction<Partial<CreatorReleaseRecord>>) {
      if (!state.selectedRelease) return;
      state.selectedRelease = { ...state.selectedRelease, ...action.payload };
    },
    applyServerRelease(state, action: PayloadAction<CreatorReleaseRecord>) {
      state.selectedRelease = action.payload;
      state.dashboard = replaceReleaseInDashboard(state.dashboard, action.payload);
    },
    resetWorkspace(state) {
      state.dashboard = EMPTY_DASHBOARD;
      state.selectedRelease = null;
    },
  },
});

export const workshopActions = workshopSlice.actions;
export const workshopReducer = workshopSlice.reducer;
