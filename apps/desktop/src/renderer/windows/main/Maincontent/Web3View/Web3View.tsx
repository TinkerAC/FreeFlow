import React, { useState } from 'react';
import { useWeb3ModalProvider, useWeb3ModalAccount, useWeb3Modal } from '@web3modal/ethers/react';
import { ethers, BrowserProvider, Contract } from 'ethers';

const FACTORY_ADDRESS = "0x0000000000000000000000000000000000000000";
const MUSIC_ASSET_ADDRESS = "0x0000000000000000000000000000000000000000";
const ROYALTY_SPLITTER_FACTORY_ABI = [
  "function createSplitter(address[] memory payees, uint256[] memory shares) public returns (address)"
];
const MUSIC_ASSET_ABI = [
  "function mintTrack(address artist, string calldata tokenURI, address royaltyReceiver, uint96 feeNumerator) public returns (uint256)"
];

export default function Web3View() {
  const { open } = useWeb3Modal();
  const { address, isConnected } = useWeb3ModalAccount();
  const { walletProvider } = useWeb3ModalProvider();
  
  const [uploadURI, setUploadURI] = useState('');
  const [status, setStatus] = useState('');

  const handlePublish = async () => {
    if (!walletProvider) return alert("Connect wallet first!");
    try {
      setStatus("Creating Splitter...");
      const ethersProvider = new BrowserProvider(walletProvider);
      const signer = await ethersProvider.getSigner();

      const factory = new Contract(FACTORY_ADDRESS, ROYALTY_SPLITTER_FACTORY_ABI, signer);
      
      const tx1 = await factory.createSplitter([address], [100]);
      await tx1.wait();
      setStatus("Splitter Created! Minting NFT...");
      
      const mockSplitterAddress = address as string; 
      const musicAsset = new Contract(MUSIC_ASSET_ADDRESS, MUSIC_ASSET_ABI, signer);
      const tx2 = await musicAsset.mintTrack(
        address,
        uploadURI || "ipfs://bafyre...", 
        mockSplitterAddress,
        1000 
      );
      await tx2.wait();
      setStatus("Music Successfully Uploaded & Anchored \u2705");
    } catch (e: any) {
      setStatus("Error: " + (e.message || e));
    }
  };

  return (
    <div className="w-full h-full p-8 text-white overflow-auto bg-black flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">Web3 Music Upload</h1>
        <button 
          onClick={() => open()} 
          className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-all font-bold backdrop-blur-md"
        >
          {isConnected ? `Connected: ${address?.slice(0, 6)}...` : 'Connect WalletConnect'}
        </button>
      </div>

      {status && (
        <div className="mb-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-medium">
          {status}
        </div>
      )}

      <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 max-w-2xl mt-4">
        <h2 className="text-2xl font-bold mb-2">Publish Track to Sepolia</h2>
        <p className="text-neutral-400 text-sm mb-8">Anchor your music to the blockchain with an automated royalty splitter.</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">IPFS CID/URI</label>
            <input 
              type="text"
              value={uploadURI}
              onChange={(e) => setUploadURI(e.target.value)}
              placeholder="ipfs://..."
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-pink-500 transition-all"
            />
          </div>
          <button 
            onClick={handlePublish}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 font-bold shadow-lg transition-all"
          >
            Mint & Create Splitter
          </button>
        </div>
      </div>
    </div>
  );
}
