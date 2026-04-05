// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/finance/PaymentSplitter.sol";

contract RoyaltySplitter is PaymentSplitter {
    constructor(address[] memory payees, uint256[] memory shares)
        PaymentSplitter(payees, shares)
    {}
}

contract RoyaltySplitterFactory {
    event SplitterCreated(address indexed splitter, address[] payees, uint256[] shares);

    // Factory pattern to create independent splitters for songs
    function createSplitter(address[] memory payees, uint256[] memory shares) public returns (address) {
        RoyaltySplitter splitter = new RoyaltySplitter(payees, shares);
        emit SplitterCreated(address(splitter), payees, shares);
        return address(splitter);
    }
}
