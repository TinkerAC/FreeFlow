// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

/// @title MusicAsset
/// @notice 用于表示已发布音乐作品的 ERC-721 合约。
/// @dev 铸造能力通过角色控制，便于平台中枢统一管理发行流程。
contract MusicAsset is ERC721URIStorage, ERC2981, AccessControl {
    /// @notice 允许铸造音乐 NFT 的角色标识。
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @dev TokenId 从 1 开始，保留 0 作为“未设置”的哨兵值。
    uint256 private _nextTokenId = 1;

    /// @notice 记录每个 tokenId 对应的原始创作者地址。
    mapping(uint256 => address) public creatorOf;

    error InvalidAdmin();
    error InvalidOwner();
    error InvalidCreator();
    error InvalidRoyaltyReceiver();
    error InvalidRoyaltyBps(uint256 royaltyBps);
    error EmptyTokenURI();

    event TrackMinted(
        uint256 indexed tokenId,
        address indexed owner,
        address indexed creator,
        address royaltyReceiver,
        uint96 royaltyBps,
        string tokenURI
    );

    /// @param name_ ERC-721 集合名称。
    /// @param symbol_ ERC-721 集合符号。
    /// @param admin 接收默认管理员角色的地址。
    constructor(
        string memory name_,
        string memory symbol_,
        address admin
    ) ERC721(name_, symbol_) {
        if (admin == address(0)) {
            revert InvalidAdmin();
        }

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice 铸造一枚音乐作品 NFT，并为其配置单独的版税信息。
    /// @dev 仅拥有 `MINTER_ROLE` 的账户可以调用。
    /// @param owner_ 新铸造 token 的接收者地址。
    /// @param creator_ 记录为原始创作者的地址。
    /// @param tokenURI_ 描述该音乐作品的元数据 URI。
    /// @param royaltyReceiver 接收 ERC-2981 版税的地址。
    /// @param royaltyBps 以基点表示的版税比例。
    /// @return tokenId 新铸造出的 token 标识。
    function mintTrack(
        address owner_,
        address creator_,
        string calldata tokenURI_,
        address royaltyReceiver,
        uint96 royaltyBps
    ) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        if (owner_ == address(0)) {
            revert InvalidOwner();
        }
        if (creator_ == address(0)) {
            revert InvalidCreator();
        }
        if (royaltyReceiver == address(0)) {
            revert InvalidRoyaltyReceiver();
        }
        if (royaltyBps > _feeDenominator()) {
            revert InvalidRoyaltyBps(royaltyBps);
        }
        if (bytes(tokenURI_).length == 0) {
            revert EmptyTokenURI();
        }

        tokenId = _nextTokenId++;
        creatorOf[tokenId] = creator_;

        _safeMint(owner_, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        _setTokenRoyalty(tokenId, royaltyReceiver, royaltyBps);

        emit TrackMinted(tokenId, owner_, creator_, royaltyReceiver, royaltyBps, tokenURI_);
    }

    /// @notice 返回当前合约对接口的支持情况。
    /// @param interfaceId 待查询的接口标识。
    /// @return 当前合约是否支持该接口。
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC2981, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /// @notice 返回指定 token 的元数据 URI。
    /// @param tokenId 需要查询的 token 标识。
    /// @return 该 token 当前存储的元数据 URI。
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
}
