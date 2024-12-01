import { contextBridge } from 'electron';
import electronContext from '@main/app/electronContext';


contextBridge.exposeInMainWorld('electronAPI', {
  allApi: electronContext,
});
