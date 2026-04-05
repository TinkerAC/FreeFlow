// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./MusicAsset.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PlatformHub is Ownable {
    MusicAsset public musicAsset;
    
    // Mapping from tokenId to a boolean indicating if it requires premium access
    mapping(uint256 => bool) public isPremium;
    // Mapping from tokenId to unlock price
    mapping(uint256 => uint256) public accessPrice;
    
    // Mapping from tokenId to user address to access status
    mapping(uint256 => mapping(address => bool)) public hasAccess;

    constructor(address _musicAsset) Ownable(msg.sender) {
        musicAsset = MusicAsset(_musicAsset);
    }

    function tipTrack(uint256 tokenId) public payable {
        require(msg.value > 0, "Tip amount must be greater than 0");
        
        // Find the royalty receiver for the track
        (address receiver, ) = musicAsset.royaltyInfo(tokenId, msg.value);
        require(receiver != address(0), "No royalty receiver set");
        
        // Transfer the tip to the royalty splitter
        (bool success, ) = payable(receiver).call{value: msg.value}("");
        require(success, "Tip transfer failed");
    }

    function buyAccess(uint256 tokenId) public payable {
        require(isPremium[tokenId], "Track is not premium");
        require(msg.value >= accessPrice[tokenId], "Insufficient payment");
        
        // Platform fee: 5%
        uint256 platformFee = (msg.value * 5) / 100;
        uint256 creatorAmount = msg.value - platformFee;
        
        (address receiver, ) = musicAsset.royaltyInfo(tokenId, creatorAmount);
        
        if (receiver != address(0)) {
            (bool success, ) = payable(receiver).call{value: creatorAmount}("");
            require(success, "Creator transfer failed");
        }
        
        hasAccess[tokenId][msg.sender] = true;
    }

    function checkAccess(address user, uint256 tokenId) public view returns (bool) {
        if (!isPremium[tokenId]) {
            return true;
        }
        if (musicAsset.ownerOf(tokenId) == user) {
            return true;
        }
        return hasAccess[tokenId][user];
    }
    
    function setPremium(uint256 tokenId, bool status, uint256 price) public {
        require(musicAsset.ownerOf(tokenId) == msg.sender, "Not track owner");
        isPremium[tokenId] = status;
        accessPrice[tokenId] = price;
    }
    
    function withdrawPlatformFees() public onlyOwner {
        (bool success, ) = msg.sender.call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }
    
    receive() external payable {}
}
