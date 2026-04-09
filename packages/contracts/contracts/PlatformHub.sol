// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./MusicAsset.sol";
import "./RoyaltySplitter.sol";

/// @title PlatformHub
/// @notice 统一协调作品发布、付费访问、打赏和平台费用归集。
/// @dev 该中枢通过 `MusicAsset` 铸造作品 NFT，并将创作者收益转入分账合约。
contract PlatformHub is Ownable2Step, Pausable, ReentrancyGuard {
    /// @notice 平台服务费上限，单位为基点。
    uint96 public constant MAX_PLATFORM_FEE_BPS = 2_500;

    /// @notice 单个作品对应的销售与访问配置。
    struct TrackSaleConfig {
        /// @notice 原始发布者，同时也是可管理销售配置的地址。
        address creator;

        /// @notice 接收创作者收益和打赏的地址。
        address payoutReceiver;

        /// @notice 当 `requiresPurchase` 为 true 时，购买访问权限所需支付的价格。
        uint256 price;

        /// @notice 是否需要付费购买访问权限，而不是默认公开访问。
        bool requiresPurchase;

        /// @notice 付费销售当前是否开启。
        bool active;
    }

    /// @notice 用于铸造音乐作品 NFT 的合约。
    MusicAsset public immutable musicAsset;

    /// @notice 用于部署收益分账合约的工厂。
    RoyaltySplitterFactory public immutable royaltySplitterFactory;

    /// @notice 接收平台累计服务费的金库地址。
    address public treasury;

    /// @notice 用户购买访问权限时收取的平台服务费，单位为基点。
    uint96 public platformFeeBps;

    /// @dev 按 tokenId 保存每个作品的销售配置。
    mapping(uint256 => TrackSaleConfig) private _trackSaleConfigs;

    /// @dev 保存付费作品的显式访问授权，第一层键为 tokenId，第二层键为账户地址。
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

    /// @param musicAsset_ 已部署的 `MusicAsset` 合约地址。
    /// @param royaltySplitterFactory_ 已部署的分账工厂地址。
    /// @param treasury_ 接收平台服务费提取的金库地址。
    /// @param platformFeeBps_ 初始平台服务费率，单位为基点。
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

    /// @notice 发布一个新作品，同时部署其收益分账合约并铸造对应 NFT。
    /// @param tokenURI_ 作品对应的元数据 URI。
    /// @param royaltyBps ERC-2981 版税比例，单位为基点。
    /// @param requiresPurchase 是否要求用户付费后才能访问作品。
    /// @param price 当 `requiresPurchase` 为 true 时的访问价格。
    /// @param saleActive 付费作品的初始销售状态。
    /// @param payees 需要写入分账合约的收款人地址列表。
    /// @param shares 与收款人一一对应的收益份额列表。
    /// @return tokenId 新铸造出的作品 tokenId。
    /// @return splitter 作为收益接收方使用的分账合约地址。
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

        // 每个作品都拥有独立分账合约，便于后续将创作者侧收益继续拆分。
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

    /// @notice 更新已发布作品的销售规则。
    /// @param tokenId 需要修改的作品 tokenId。
    /// @param requiresPurchase 是否需要付费访问。
    /// @param active 付费销售是否处于启用状态。
    /// @param price 付费作品更新后的访问价格。
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

    /// @notice 手动向指定账户授予某个作品的访问权限。
    /// @param tokenId 被授予访问权限的作品 tokenId。
    /// @param account 需要获得访问权限的账户地址。
    function grantAccess(uint256 tokenId, address account) external whenNotPaused {
        if (account == address(0)) {
            revert InvalidAddress();
        }

        TrackSaleConfig storage config = _trackConfigOrRevert(tokenId);
        _requireTrackManager(tokenId, config);

        _accessPasses[tokenId][account] = true;
        emit TrackAccessGranted(tokenId, account);
    }

    /// @notice 购买某个付费作品的访问权限。
    /// @param tokenId 需要购买访问权限的作品 tokenId。
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
        // 这里只立即转出创作者收益，平台服务费暂留在当前合约，后续由金库提取。
        _forwardNative(config.payoutReceiver, creatorProceeds);

        emit TrackAccessPurchased(tokenId, msg.sender, msg.value, platformFee, creatorProceeds);
    }

    /// @notice 向作品的收益接收方直接发送打赏。
    /// @param tokenId 接收打赏的作品 tokenId。
    function tipTrack(uint256 tokenId) external payable nonReentrant whenNotPaused {
        TrackSaleConfig storage config = _trackConfigOrRevert(tokenId);

        if (msg.value == 0) {
            revert InvalidPrice();
        }

        _forwardNative(config.payoutReceiver, msg.value);
        emit TrackTipped(tokenId, msg.sender, msg.value);
    }

    /// @notice 判断某个账户是否具备指定作品的访问权限。
    /// @param account 需要检查的账户地址。
    /// @param tokenId 需要检查的作品 tokenId。
    /// @return 该账户当前是否应被视为具有访问权限。
    function hasAccess(address account, uint256 tokenId) public view returns (bool) {
        TrackSaleConfig storage config = _trackSaleConfigs[tokenId];

        if (config.creator == address(0)) {
            return false;
        }
        // 免费作品一旦发布，默认所有人都可访问。
        if (!config.requiresPurchase) {
            return true;
        }
        // 创作者、被手动授权的账户以及当前 NFT 持有者都保留访问权限。
        if (account == config.creator) {
            return true;
        }
        if (_accessPasses[tokenId][account]) {
            return true;
        }

        return musicAsset.ownerOf(tokenId) == account;
    }

    /// @notice 返回指定作品当前的销售配置。
    /// @param tokenId 需要查询的作品 tokenId。
    /// @return creator 原始作品发布者地址。
    /// @return payoutReceiver 接收创作者侧收益的地址。
    /// @return price 付费访问价格。
    /// @return requiresPurchase 是否需要购买后访问。
    /// @return active 当前销售是否处于启用状态。
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

    /// @notice 按当前费率返回某个作品的付款拆分预览。
    /// @param tokenId 需要查询的作品 tokenId。
    /// @return price 用户需要支付的总金额。
    /// @return platformFee 平台保留的服务费部分。
    /// @return creatorProceeds 转给作品收益接收方的金额。
    function paymentPreview(uint256 tokenId) external view returns (uint256 price, uint256 platformFee, uint256 creatorProceeds) {
        TrackSaleConfig storage config = _trackConfigOrRevert(tokenId);
        price = config.price;
        platformFee = (price * platformFeeBps) / 10_000;
        creatorProceeds = price - platformFee;
    }

    /// @notice 更新后续提取平台服务费时使用的金库地址。
    /// @param treasury_ 新的金库地址。
    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) {
            revert InvalidAddress();
        }

        treasury = treasury_;
        emit TreasuryUpdated(treasury_);
    }

    /// @notice 更新购买访问权限时收取的平台服务费率。
    /// @param platformFeeBps_ 新的平台服务费率，单位为基点。
    function setPlatformFeeBps(uint96 platformFeeBps_) external onlyOwner {
        _setPlatformFeeBps(platformFeeBps_);
    }

    /// @notice 将合约中累计的平台服务费提取到金库地址。
    function withdrawTreasury() external onlyOwner nonReentrant {
        uint256 amount = address(this).balance;
        _forwardNative(treasury, amount);
        emit TreasuryWithdrawn(treasury, amount);
    }

    /// @notice 暂停发布、销售和打赏等对外操作。
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice 恢复发布、销售和打赏等对外操作。
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @dev 校验并保存新的平台服务费率。
    function _setPlatformFeeBps(uint96 platformFeeBps_) internal {
        if (platformFeeBps_ > MAX_PLATFORM_FEE_BPS) {
            revert InvalidFeeBps(platformFeeBps_);
        }

        platformFeeBps = platformFeeBps_;
        emit PlatformFeeUpdated(platformFeeBps_);
    }

    /// @dev 限制销售配置修改类操作只能由作品创作者执行。
    function _requireTrackManager(uint256 tokenId, TrackSaleConfig storage config) internal view {
        if (config.creator != msg.sender) {
            revert Unauthorized(msg.sender, tokenId);
        }
    }

    /// @dev 读取作品配置；若 tokenId 未登记则直接回退。
    function _trackConfigOrRevert(uint256 tokenId) internal view returns (TrackSaleConfig storage config) {
        config = _trackSaleConfigs[tokenId];
        if (config.creator == address(0)) {
            revert TrackNotFound(tokenId);
        }
    }

    /// @dev 使用底层 call 转发原生代币，以兼容合约地址收款。
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
