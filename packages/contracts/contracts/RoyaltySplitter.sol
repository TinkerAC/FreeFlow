// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract RoyaltySplitter {
    uint256 public totalShares;
    uint256 public totalReleased;

    mapping(address => uint256) public shares;
    mapping(address => uint256) public released;

    address[] private _payees;

    constructor(address[] memory payees, uint256[] memory shares_) payable {
        require(payees.length > 0, "No payees");
        require(payees.length == shares_.length, "Length mismatch");

        for (uint256 i = 0; i < payees.length; i++) {
            _addPayee(payees[i], shares_[i]);
        }
    }

    receive() external payable {}

    function payee(uint256 index) public view returns (address) {
        return _payees[index];
    }

    function payeeCount() public view returns (uint256) {
        return _payees.length;
    }

    function releasable(address account) public view returns (uint256) {
        require(shares[account] > 0, "Account has no shares");

        uint256 totalReceived = address(this).balance + totalReleased;
        return (totalReceived * shares[account]) / totalShares - released[account];
    }

    function release(address payable account) public {
        uint256 payment = releasable(account);
        require(payment > 0, "No payment due");

        released[account] += payment;
        totalReleased += payment;

        (bool success, ) = account.call{value: payment}("");
        require(success, "Payment failed");
    }

    function _addPayee(address account, uint256 share) internal {
        require(account != address(0), "Invalid payee");
        require(share > 0, "Shares are 0");
        require(shares[account] == 0, "Payee exists");

        _payees.push(account);
        shares[account] = share;
        totalShares += share;
    }
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
