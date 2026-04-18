export const DEFAULT_SEPOLIA_CONTRACTS = {
  chainId: 11155111,
  chainName: 'Sepolia',
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
  explorerUrl: 'https://sepolia.etherscan.io',
  musicAssetAddress: '0x91B67981Ea0c735E91a008045b718B961658c3Ce',
  platformHubAddress: '0x50F5476B007cC2500F975F63B192cFd457058A8A',
  platformFeeBps: 500,
} as const;

export const PLATFORM_HUB_ABI = [
  'event TrackPublished(uint256 indexed tokenId, address indexed creator, address indexed payoutReceiver, bool requiresPurchase, bool active, uint256 price)',
  'function publishTrack(string tokenURI_, bool requiresPurchase, uint256 price, bool saleActive, address[] payees, uint256[] shares) returns (uint256 tokenId, address splitter)',
  'function updateTrackSale(uint256 tokenId, bool requiresPurchase, bool active, uint256 price)',
  'function buyAccess(uint256 tokenId) payable',
  'function hasAccess(address account, uint256 tokenId) view returns (bool)',
  'function getTrackSaleConfig(uint256 tokenId) view returns (address creator, address payoutReceiver, uint256 price, bool requiresPurchase, bool active)',
  'function paymentPreview(uint256 tokenId) view returns (uint256 price, uint256 platformFee, uint256 creatorProceeds)',
  'function platformFeeBps() view returns (uint96)',
] as const;

export const MUSIC_ACCESS_1155_ABI = [
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'function creatorOf(uint256 tokenId) view returns (address)',
  'function uri(uint256 tokenId) view returns (string)',
] as const;

export const ROYALTY_SPLITTER_FACTORY_ABI = [
  'function createSplitter(address[] payees, uint256[] shares) returns (address)',
] as const;
