import { ElectronContextApi } from '@main/app/electronContext';


const context :ElectronContextApi = (window as any).electronAPI?.allApi;



export default context;