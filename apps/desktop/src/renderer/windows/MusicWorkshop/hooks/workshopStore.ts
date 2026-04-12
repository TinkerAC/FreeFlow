import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import { workshopReducer } from './workshopSlice';

export const musicWorkshopStore = configureStore({
  reducer: {
    workshop: workshopReducer,
  },
});

export type MusicWorkshopRootState = ReturnType<typeof musicWorkshopStore.getState>;
export type MusicWorkshopDispatch = typeof musicWorkshopStore.dispatch;

export const useMusicWorkshopDispatch = () => useDispatch<MusicWorkshopDispatch>();
export const useMusicWorkshopSelector: TypedUseSelectorHook<MusicWorkshopRootState> = useSelector;
