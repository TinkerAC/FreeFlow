// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract RoyaltySplitter is ReentrancyGuard {
    uint256 public totalShares;
    uint256 public totalReleased;

    mapping(address => uint256) public shares;
    mapping(address => uint256) public released;

    address[] private _payees;

    error EmptyPayees();
    error LengthMismatch();
    error InvalidPayee();
    error InvalidShares();
    error DuplicatePayee(address account);
    error AccountHasNoShares(address account);
    error NoPaymentDue(address account);
    error EthTransferFailed(address recipient, uint256 amount);

    event PayeeAdded(address indexed account, uint256 shares);
    event PaymentReleased(address indexed to, uint256 amount);
    event PaymentReceived(address indexed from, uint256 amount);

    constructor(address[] memory payees, uint256[] memory shares_) payable {
        if (payees.length == 0) {
            revert EmptyPayees();
        }
        if (payees.length != shares_.length) {
            revert LengthMismatch();
        }

        for (uint256 i = 0; i < payees.length; i++) {
            _addPayee(payees[i], shares_[i]);
        }
    }

    receive() external payable {
        emit PaymentReceived(msg.sender, msg.value);
    }

    function payee(uint256 index) external view returns (address) {
        return _payees[index];
    }

    function payeeCount() external view returns (uint256) {
        return _payees.length;
    }

    function releasable(address account) public view returns (uint256) {
        uint256 accountShares = shares[account];
        if (accountShares == 0) {
            revert AccountHasNoShares(account);
        }

        uint256 totalReceived = address(this).balance + totalReleased;
        return (totalReceived * accountShares) / totalShares - released[account];
    }

    function release(address payable account) external nonReentrant {
        uint256 payment = releasable(account);
        if (payment == 0) {
            revert NoPaymentDue(account);
        }

        released[account] += payment;
        totalReleased += payment;

        (bool success, ) = account.call{value: payment}("");
        if (!success) {
            revert EthTransferFailed(account, payment);
        }

        emit PaymentReleased(account, payment);
    }

    function _addPayee(address account, uint256 share_) internal {
        if (account == address(0)) {
            revert InvalidPayee();
        }
        if (share_ == 0) {
            revert InvalidShares();
        }
        if (shares[account] != 0) {
            revert DuplicatePayee(account);
        }

        _payees.push(account);
        shares[account] = share_;
        totalShares += share_;

        emit PayeeAdded(account, share_);
    }
}

contract RoyaltySplitterFactory {
    event SplitterCreated(
        address indexed splitter,
        address indexed caller,
        address[] payees,
        uint256[] shares
    );

    function createSplitter(
        address[] calldata payees,
        uint256[] calldata shares
    ) external returns (address splitter) {
        RoyaltySplitter newSplitter = new RoyaltySplitter(payees, shares);
        splitter = address(newSplitter);

        emit SplitterCreated(splitter, msg.sender, payees, shares);
    }
}
