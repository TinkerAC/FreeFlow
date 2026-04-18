// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

/// @title MusicAccess1155
/// @notice ERC-1155 access passes for published FreeFlow tracks.
/// @dev Each token id represents one track. A buyer owns access when their balance is greater than zero.
contract MusicAccess1155 is ERC1155, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 private _nextTokenId = 1;

    mapping(uint256 => address) public creatorOf;
    mapping(uint256 => bool) public trackExists;
    mapping(uint256 => string) private _tokenURIs;

    error InvalidAdmin();
    error InvalidCreator();
    error InvalidRecipient();
    error InvalidAmount();
    error EmptyTokenURI();
    error TrackNotFound(uint256 tokenId);
    error Unauthorized(address caller, uint256 tokenId);
    error NonTransferableAccessToken();

    event TrackCreated(uint256 indexed tokenId, address indexed creator, string tokenURI);
    event TrackURIUpdated(uint256 indexed tokenId, string tokenURI);
    event AccessMinted(uint256 indexed tokenId, address indexed account, uint256 amount);

    constructor(address admin) ERC1155("") {
        if (admin == address(0)) {
            revert InvalidAdmin();
        }

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Create a new track token type. This does not mint a balance to the creator.
    function createTrack(address creator_, string calldata tokenURI_)
        external
        onlyRole(MINTER_ROLE)
        returns (uint256 tokenId)
    {
        if (creator_ == address(0)) {
            revert InvalidCreator();
        }
        if (bytes(tokenURI_).length == 0) {
            revert EmptyTokenURI();
        }

        tokenId = _nextTokenId++;
        creatorOf[tokenId] = creator_;
        trackExists[tokenId] = true;
        _tokenURIs[tokenId] = tokenURI_;

        emit TrackCreated(tokenId, creator_, tokenURI_);
        emit URI(tokenURI_, tokenId);
    }

    /// @notice Mint access credentials to a buyer after a successful purchase.
    function mintAccess(address to, uint256 tokenId, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (to == address(0)) {
            revert InvalidRecipient();
        }
        if (amount == 0) {
            revert InvalidAmount();
        }
        if (!trackExists[tokenId]) {
            revert TrackNotFound(tokenId);
        }

        _mint(to, tokenId, amount, "");
        emit AccessMinted(tokenId, to, amount);
    }

    /// @notice Update the metadata URI for a track token.
    function setTrackURI(uint256 tokenId, string calldata newURI) external {
        if (!trackExists[tokenId]) {
            revert TrackNotFound(tokenId);
        }
        if (bytes(newURI).length == 0) {
            revert EmptyTokenURI();
        }
        if (
            msg.sender != creatorOf[tokenId] &&
            !hasRole(DEFAULT_ADMIN_ROLE, msg.sender) &&
            !hasRole(MINTER_ROLE, msg.sender)
        ) {
            revert Unauthorized(msg.sender, tokenId);
        }

        _tokenURIs[tokenId] = newURI;
        emit TrackURIUpdated(tokenId, newURI);
        emit URI(newURI, tokenId);
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        if (!trackExists[tokenId]) {
            revert TrackNotFound(tokenId);
        }

        return _tokenURIs[tokenId];
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override {
        if (from != address(0) && to != address(0)) {
            revert NonTransferableAccessToken();
        }

        super._update(from, to, ids, values);
    }
}
