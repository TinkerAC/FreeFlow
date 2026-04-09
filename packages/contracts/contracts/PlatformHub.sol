// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./MusicAsset.sol";
import "./RoyaltySplitter.sol";

contract PlatformHub is Ownable2Step, Pausable, ReentrancyGuard {
    uint96 public constant MAX_PLATFORM_FEE_BPS = 2_500;

    struct TrackSaleConfig {
        address creator;
        address payoutReceiver;
        uint256 price;
        bool requiresPurchase;
        bool active;
    }

    MusicAsset public immutable musicAsset;
    RoyaltySplitterFactory public immutable royaltySplitterFactory;

    address public treasury;
    uint96 public platformFeeBps;

    mapping(uint256 => TrackSaleConfig) private _trackSaleConfigs;
    mapping(uint256 => mapping(address => bool)) private _accessPasses;

    error InvalidAddress();
    error InvalidRoyaltyBps(uint256 royaltyBps);
    error InvalidPrice();
    error InvalidFeeBps(uint96 feeBps);
    error TrackNotFound(uint256 tokenId);
    error TrackAlreadyAccessible(uint256 tokenId, address account);
    error TrackDoesNotRequirePurchase(uint256 tokenId);
    error TrackSaleInactive(uint256 tokenId);
    error IncorrectPayment(uint256 expected, uint256 received);
    error Unauthorized(address caller, uint256 tokenId);
    error EthTransferFailed(address recipient, uint256 amount);

    event TrackPublished(
        uint256 indexed tokenId,
        address indexed creator,
        address indexed payoutReceiver,
        bool requiresPurchase,
        bool active,
        uint256 price,
        uint96 royaltyBps
    );
    event TrackSaleUpdated(uint256 indexed tokenId, bool requiresPurchase, bool active, uint256 price);
    event TrackAccessPurchased(
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 price,
        uint256 platformFee,
        uint256 creatorProceeds
    );
    event TrackAccessGranted(uint256 indexed tokenId, address indexed account);
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

        musicAsset = MusicAsset(musicAsset_);
        royaltySplitterFactory = RoyaltySplitterFactory(royaltySplitterFactory_);
        treasury = treasury_;
        _setPlatformFeeBps(platformFeeBps_);
    }

    function publishTrack(
        string calldata tokenURI_,
        uint96 royaltyBps,
        bool requiresPurchase,
        uint256 price,
        bool saleActive,
        address[] calldata payees,
        uint256[] calldata shares
    ) external whenNotPaused returns (uint256 tokenId, address splitter) {
        if (royaltyBps > 10_000) {
            revert InvalidRoyaltyBps(royaltyBps);
        }
        if (requiresPurchase && price == 0) {
            revert InvalidPrice();
        }
        if (!requiresPurchase && price != 0) {
            revert InvalidPrice();
        }

        splitter = royaltySplitterFactory.createSplitter(payees, shares);
        tokenId = musicAsset.mintTrack(msg.sender, msg.sender, tokenURI_, splitter, royaltyBps);

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
            requiresPurchase ? price : 0,
            royaltyBps
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

    function grantAccess(uint256 tokenId, address account) external whenNotPaused {
        if (account == address(0)) {
            revert InvalidAddress();
        }

        TrackSaleConfig storage config = _trackConfigOrRevert(tokenId);
        _requireTrackManager(tokenId, config);

        _accessPasses[tokenId][account] = true;
        emit TrackAccessGranted(tokenId, account);
    }

    function buyAccess(uint256 tokenId) external payable nonReentrant whenNotPaused {
        TrackSaleConfig storage config = _trackConfigOrRevert(tokenId);

        if (!config.requiresPurchase) {
            revert TrackDoesNotRequirePurchase(tokenId);
        }
        if (!config.active) {
            revert TrackSaleInactive(tokenId);
        }
        if (hasAccess(msg.sender, tokenId)) {
            revert TrackAlreadyAccessible(tokenId, msg.sender);
        }
        if (msg.value != config.price) {
            revert IncorrectPayment(config.price, msg.value);
        }

        uint256 platformFee = (msg.value * platformFeeBps) / 10_000;
        uint256 creatorProceeds = msg.value - platformFee;

        _accessPasses[tokenId][msg.sender] = true;
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
        if (_accessPasses[tokenId][account]) {
            return true;
        }

        return musicAsset.ownerOf(tokenId) == account;
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
