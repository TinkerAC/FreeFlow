// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./MusicAccess1155.sol";
import "./RoyaltySplitter.sol";

/// @title PlatformHub
/// @notice Coordinates track publishing, paid access minting, tips, and platform fees.
contract PlatformHub is Ownable2Step, Pausable, ReentrancyGuard {
    uint96 public constant MAX_PLATFORM_FEE_BPS = 2_500;

    struct TrackSaleConfig {
        address creator;
        address payoutReceiver;
        uint256 price;
        bool requiresPurchase;
        bool active;
    }

    /// @notice ERC-1155 access credential contract. Each token id represents one published track.
    MusicAccess1155 public immutable musicAsset;

    /// @notice Factory used to create one revenue splitter per track.
    RoyaltySplitterFactory public immutable royaltySplitterFactory;

    address public treasury;
    uint96 public platformFeeBps;

    mapping(uint256 => TrackSaleConfig) private _trackSaleConfigs;

    error InvalidAddress();
    error InvalidPrice();
    error InvalidFeeBps(uint96 feeBps);
    error TrackNotFound(uint256 tokenId);
    error TrackAlreadyAccessible(uint256 tokenId, address account);
    error TrackDoesNotRequirePurchase(uint256 tokenId);
    error TrackSaleInactive(uint256 tokenId);
    error IncorrectPayment(uint256 expected, uint256 received);
    error CreatorCannotBuyOwnTrack(uint256 tokenId, address creator);
    error Unauthorized(address caller, uint256 tokenId);
    error EthTransferFailed(address recipient, uint256 amount);

    event TrackPublished(
        uint256 indexed tokenId,
        address indexed creator,
        address indexed payoutReceiver,
        bool requiresPurchase,
        bool active,
        uint256 price
    );
    event TrackSaleUpdated(uint256 indexed tokenId, bool requiresPurchase, bool active, uint256 price);
    event TrackAccessPurchased(
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 price,
        uint256 platformFee,
        uint256 creatorProceeds
    );
    event TrackTipped(uint256 indexed tokenId, address indexed sender, uint256 amount);
    event TreasuryUpdated(address indexed treasury);
    event PlatformFeeUpdated(uint96 feeBps);
    event TreasuryWithdrawn(address indexed treasury, uint256 amount);

    constructor(
        address musicAsset_,
        address royaltySplitterFactory_,
        address treasury_,
        uint96 platformFeeBps_
    ) Ownable(msg.sender) {
        if (
            musicAsset_ == address(0) ||
            royaltySplitterFactory_ == address(0) ||
            treasury_ == address(0)
        ) {
            revert InvalidAddress();
        }

        musicAsset = MusicAccess1155(musicAsset_);
        royaltySplitterFactory = RoyaltySplitterFactory(royaltySplitterFactory_);
        treasury = treasury_;
        _setPlatformFeeBps(platformFeeBps_);
    }

    /// @notice Publish a track, create its revenue splitter, and create the ERC-1155 token type.
    function publishTrack(
        string calldata tokenURI_,
        bool requiresPurchase,
        uint256 price,
        bool saleActive,
        address[] calldata payees,
        uint256[] calldata shares
    ) external whenNotPaused returns (uint256 tokenId, address splitter) {
        if (requiresPurchase && price == 0) {
            revert InvalidPrice();
        }
        if (!requiresPurchase && price != 0) {
            revert InvalidPrice();
        }

        splitter = royaltySplitterFactory.createSplitter(payees, shares);
        tokenId = musicAsset.createTrack(msg.sender, tokenURI_);

        _trackSaleConfigs[tokenId] = TrackSaleConfig({
            creator: msg.sender,
            payoutReceiver: splitter,
            price: requiresPurchase ? price : 0,
            requiresPurchase: requiresPurchase,
            active: requiresPurchase ? saleActive : true
        });

        emit TrackPublished(
            tokenId,
            msg.sender,
            splitter,
            requiresPurchase,
            requiresPurchase ? saleActive : true,
            requiresPurchase ? price : 0
        );
    }

    function updateTrackSale(
        uint256 tokenId,
        bool requiresPurchase,
        bool active,
        uint256 price
    ) external whenNotPaused {
        TrackSaleConfig storage config = _trackConfigOrRevert(tokenId);
        _requireTrackManager(tokenId, config);

        if (requiresPurchase && price == 0) {
            revert InvalidPrice();
        }
        if (!requiresPurchase && price != 0) {
            revert InvalidPrice();
        }

        config.requiresPurchase = requiresPurchase;
        config.active = requiresPurchase ? active : true;
        config.price = requiresPurchase ? price : 0;

        emit TrackSaleUpdated(tokenId, requiresPurchase, config.active, config.price);
    }

    /// @notice Buy access to a paid track and mint exactly one ERC-1155 access credential to the buyer.
    function buyAccess(uint256 tokenId) external payable nonReentrant whenNotPaused {
        TrackSaleConfig storage config = _trackConfigOrRevert(tokenId);

        if (!config.requiresPurchase) {
            revert TrackDoesNotRequirePurchase(tokenId);
        }
        if (!config.active) {
            revert TrackSaleInactive(tokenId);
        }
        if (msg.sender == config.creator) {
            revert CreatorCannotBuyOwnTrack(tokenId, config.creator);
        }
        if (musicAsset.balanceOf(msg.sender, tokenId) > 0) {
            revert TrackAlreadyAccessible(tokenId, msg.sender);
        }
        if (msg.value != config.price) {
            revert IncorrectPayment(config.price, msg.value);
        }

        uint256 platformFee = (msg.value * platformFeeBps) / 10_000;
        uint256 creatorProceeds = msg.value - platformFee;

        musicAsset.mintAccess(msg.sender, tokenId, 1);
        _forwardNative(config.payoutReceiver, creatorProceeds);

        emit TrackAccessPurchased(tokenId, msg.sender, msg.value, platformFee, creatorProceeds);
    }

    function tipTrack(uint256 tokenId) external payable nonReentrant whenNotPaused {
        TrackSaleConfig storage config = _trackConfigOrRevert(tokenId);

        if (msg.value == 0) {
            revert InvalidPrice();
        }

        _forwardNative(config.payoutReceiver, msg.value);
        emit TrackTipped(tokenId, msg.sender, msg.value);
    }

    function hasAccess(address account, uint256 tokenId) public view returns (bool) {
        TrackSaleConfig storage config = _trackSaleConfigs[tokenId];

        if (config.creator == address(0)) {
            return false;
        }
        if (!config.requiresPurchase) {
            return true;
        }
        if (account == config.creator) {
            return true;
        }

        return musicAsset.balanceOf(account, tokenId) > 0;
    }

    function getTrackSaleConfig(uint256 tokenId)
        external
        view
        returns (
            address creator,
            address payoutReceiver,
            uint256 price,
            bool requiresPurchase,
            bool active
        )
    {
        TrackSaleConfig storage config = _trackConfigOrRevert(tokenId);
        return (
            config.creator,
            config.payoutReceiver,
            config.price,
            config.requiresPurchase,
            config.active
        );
    }

    function paymentPreview(uint256 tokenId) external view returns (uint256 price, uint256 platformFee, uint256 creatorProceeds) {
        TrackSaleConfig storage config = _trackConfigOrRevert(tokenId);
        price = config.price;
        platformFee = (price * platformFeeBps) / 10_000;
        creatorProceeds = price - platformFee;
    }

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) {
            revert InvalidAddress();
        }

        treasury = treasury_;
        emit TreasuryUpdated(treasury_);
    }

    function setPlatformFeeBps(uint96 platformFeeBps_) external onlyOwner {
        _setPlatformFeeBps(platformFeeBps_);
    }

    function withdrawTreasury() external onlyOwner nonReentrant {
        uint256 amount = address(this).balance;
        _forwardNative(treasury, amount);
        emit TreasuryWithdrawn(treasury, amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _setPlatformFeeBps(uint96 platformFeeBps_) internal {
        if (platformFeeBps_ > MAX_PLATFORM_FEE_BPS) {
            revert InvalidFeeBps(platformFeeBps_);
        }

        platformFeeBps = platformFeeBps_;
        emit PlatformFeeUpdated(platformFeeBps_);
    }

    function _requireTrackManager(uint256 tokenId, TrackSaleConfig storage config) internal view {
        if (config.creator != msg.sender) {
            revert Unauthorized(msg.sender, tokenId);
        }
    }

    function _trackConfigOrRevert(uint256 tokenId) internal view returns (TrackSaleConfig storage config) {
        config = _trackSaleConfigs[tokenId];
        if (config.creator == address(0)) {
            revert TrackNotFound(tokenId);
        }
    }

    function _forwardNative(address recipient, uint256 amount) internal {
        if (amount == 0) {
            return;
        }

        (bool success, ) = payable(recipient).call{value: amount}("");
        if (!success) {
            revert EthTransferFailed(recipient, amount);
        }
    }
}
