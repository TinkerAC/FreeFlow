// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

contract MusicAsset is ERC721URIStorage, ERC2981, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 private _nextTokenId = 1;

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

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC2981, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
}
