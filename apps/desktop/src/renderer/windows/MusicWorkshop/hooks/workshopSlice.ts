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
import {
  autosaveReleaseThunk,
  buyAccessThunk,
  createReleaseThunk,
  publishReleaseThunk,
  refreshAccessThunk,
  refreshDashboardThunk,
  refreshWeb25StateThunk,
  siweLoginThunk,
  siweLogoutThunk,
  uploadAssetsThunk,
  uploadMetadataThunk,
} from './workshopThunks';

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
  extraReducers: (builder) => {
    builder
      .addCase(refreshWeb25StateThunk.fulfilled, (state, action) => {
        state.web25Session = action.payload.session;
        state.pinataConfig = action.payload.pinataConfig;
      })
      .addCase(refreshDashboardThunk.pending, (state) => {
        state.busyState = 'loading-dashboard';
      })
      .addCase(refreshDashboardThunk.fulfilled, (state, action) => {
        state.dashboard = action.payload.dashboard;
        state.selectedRelease = action.payload.selectedRelease;
        state.busyState = 'idle';
      })
      .addCase(refreshDashboardThunk.rejected, (state) => {
        state.busyState = 'idle';
      })
      .addCase(createReleaseThunk.fulfilled, (state, action) => {
        state.selectedRelease = action.payload;
        state.dashboard = replaceReleaseInDashboard(state.dashboard, action.payload);
      })
      .addCase(siweLoginThunk.pending, (state) => {
        state.authBusy = true;
      })
      .addCase(siweLoginThunk.fulfilled, (state, action) => {
        state.authBusy = false;
        state.web25Session = action.payload.session;
      })
      .addCase(siweLoginThunk.rejected, (state) => {
        state.authBusy = false;
      })
      .addCase(siweLogoutThunk.pending, (state) => {
        state.authBusy = true;
      })
      .addCase(siweLogoutThunk.fulfilled, (state) => {
        state.authBusy = false;
        state.web25Session = null;
        state.dashboard = EMPTY_DASHBOARD;
        state.selectedRelease = null;
      })
      .addCase(siweLogoutThunk.rejected, (state) => {
        state.authBusy = false;
      })
      .addCase(autosaveReleaseThunk.pending, (state) => {
        state.autosaveState = 'saving';
      })
      .addCase(autosaveReleaseThunk.fulfilled, (state) => {
        state.autosaveState = 'saved';
      })
      .addCase(autosaveReleaseThunk.rejected, (state) => {
        state.autosaveState = 'error';
      })
      .addCase(uploadAssetsThunk.pending, (state) => {
        state.busyState = 'uploading-assets';
      })
      .addCase(uploadAssetsThunk.fulfilled, (state, action) => {
        state.selectedRelease = action.payload;
        state.dashboard = replaceReleaseInDashboard(state.dashboard, action.payload);
        state.busyState = 'idle';
      })
      .addCase(uploadAssetsThunk.rejected, (state) => {
        state.busyState = 'idle';
      })
      .addCase(uploadMetadataThunk.pending, (state) => {
        state.busyState = 'uploading-metadata';
      })
      .addCase(uploadMetadataThunk.fulfilled, (state, action) => {
        state.selectedRelease = action.payload;
        state.dashboard = replaceReleaseInDashboard(state.dashboard, action.payload);
        state.busyState = 'idle';
        if (action.payload.currentStage === 'publish') {
          state.activePanel = 'publish';
        }
      })
      .addCase(uploadMetadataThunk.rejected, (state) => {
        state.busyState = 'idle';
      })
      .addCase(publishReleaseThunk.pending, (state) => {
        state.busyState = 'publishing';
      })
      .addCase(publishReleaseThunk.fulfilled, (state, action) => {
        state.selectedRelease = action.payload.release;
        state.dashboard = replaceReleaseInDashboard(state.dashboard, action.payload.release);
        state.busyState = 'idle';
        if (action.payload.accessCheck) {
          state.activePanel = 'access';
        }
      })
      .addCase(publishReleaseThunk.rejected, (state) => {
        state.busyState = 'idle';
      })
      .addCase(refreshAccessThunk.pending, (state) => {
        state.busyState = 'checking-access';
      })
      .addCase(refreshAccessThunk.fulfilled, (state) => {
        state.busyState = 'idle';
      })
      .addCase(refreshAccessThunk.rejected, (state) => {
        state.busyState = 'idle';
      })
      .addCase(buyAccessThunk.pending, (state) => {
        state.busyState = 'buying';
      })
      .addCase(buyAccessThunk.fulfilled, (state, action) => {
        state.busyState = 'idle';
        if (!action.payload) return;
        state.selectedRelease = action.payload;
        state.dashboard = replaceReleaseInDashboard(state.dashboard, action.payload);
      })
      .addCase(buyAccessThunk.rejected, (state) => {
        state.busyState = 'idle';
      });
  },
});

export const workshopActions = workshopSlice.actions;
export const workshopReducer = workshopSlice.reducer;
