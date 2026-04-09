// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title RoyaltySplitter
/// @notice 按照固定份额在多个收款人之间分配原生代币收入。
/// @dev 份额在部署时确定，部署后不可再修改。
contract RoyaltySplitter is ReentrancyGuard {
    /// @notice 所有收款人份额之和。
    uint256 public totalShares;

    /// @notice 已从分账合约中释放出去的原生代币总额。
    uint256 public totalReleased;

    /// @notice 每个收款人对应的份额数量。
    mapping(address => uint256) public shares;

    /// @notice 每个收款人已经提取的原生代币数量。
    mapping(address => uint256) public released;

    /// @dev 按顺序保存所有收款人，便于按索引遍历。
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

    /// @param payees 有权从分账合约中领取资金的地址列表。
    /// @param shares_ 与收款人地址一一对应的相对份额列表。
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

    /// @notice 接收原生代币并记录付款方。
    receive() external payable {
        emit PaymentReceived(msg.sender, msg.value);
    }

    /// @notice 返回指定索引位置的收款人地址。
    /// @param index 收款人在内部数组中的位置。
    /// @return 该索引对应的收款人地址。
    function payee(uint256 index) external view returns (address) {
        return _payees[index];
    }

    /// @notice 返回当前已登记的收款人数。
    /// @return 分账合约中配置的收款人数。
    function payeeCount() external view returns (uint256) {
        return _payees.length;
    }

    /// @notice 计算某个收款人当前可提取的金额。
    /// @param account 需要查询的收款人地址。
    /// @return 该收款人此刻可以领取的原生代币数量。
    function releasable(address account) public view returns (uint256) {
        uint256 accountShares = shares[account];
        if (accountShares == 0) {
            revert AccountHasNoShares(account);
        }

        uint256 totalReceived = address(this).balance + totalReleased;
        // 将历史已释放金额加回，确保分账比例基于累计收到的总金额计算。
        return (totalReceived * accountShares) / totalShares - released[account];
    }

    /// @notice 将累计可领取的原生代币转给指定收款人。
    /// @param account 接收本次付款的收款人地址。
    function release(address payable account) external nonReentrant {
        uint256 payment = releasable(account);
        if (payment == 0) {
            revert NoPaymentDue(account);
        }

        // 先更新内部记账，再进行外部转账，遵循 checks-effects-interactions。
        released[account] += payment;
        totalReleased += payment;

        (bool success, ) = account.call{value: payment}("");
        if (!success) {
            revert EthTransferFailed(account, payment);
        }

        emit PaymentReleased(account, payment);
    }

    /// @dev 在构造阶段登记收款人，并校验地址、份额及唯一性。
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

/// @title RoyaltySplitterFactory
/// @notice 为已发布作品部署新的分账合约。
contract RoyaltySplitterFactory {
    event SplitterCreated(
        address indexed splitter,
        address indexed caller,
        address[] payees,
        uint256[] shares
    );

    /// @notice 根据提供的收款人配置部署一个新的分账合约。
    /// @param payees 后续可以参与收益分配的地址列表。
    /// @param shares 与收款人一一对应的相对份额列表。
    /// @return splitter 新部署出的分账合约地址。
    function createSplitter(
        address[] calldata payees,
        uint256[] calldata shares
    ) external returns (address splitter) {
        RoyaltySplitter newSplitter = new RoyaltySplitter(payees, shares);
        splitter = address(newSplitter);

        emit SplitterCreated(splitter, msg.sender, payees, shares);
    }
}
