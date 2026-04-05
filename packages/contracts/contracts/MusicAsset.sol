// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MusicAsset is ERC721URIStorage, ERC2981, Ownable {
    uint256 private _nextTokenId;

    constructor() ERC721("MusicAsset", "MA") Ownable(msg.sender) {}

    function mintTrack(
        address artist,
        string memory tokenURI_,
        address royaltyReceiver,
        uint96 feeNumerator
    ) public returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(artist, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        // Set the royalty for this specific token
        _setTokenRoyalty(tokenId, royaltyReceiver, feeNumerator);
        return tokenId;
    }

    // tokenURI is inherently strictly supported by ERC721URIStorage and handles the fetch logic.

    // The following functions are overrides required by Solidity.
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
