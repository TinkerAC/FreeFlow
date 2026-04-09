// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title HelloWorld
/// @notice 在链上存储一段可变消息，并在消息更新时触发事件。
contract HelloWorld {
    /// @dev 用于保存当前最新的消息内容。
    string private _message;

    /// @notice 部署该合约的地址。
    address public immutable owner;

    /// @notice 当消息被更新时触发。
    event MessageUpdated(string oldMessage, string newMessage, address indexed updater);

    /// @param initialMessage 合约初始化时写入的首条消息。
    constructor(string memory initialMessage) {
        owner = msg.sender;
        _message = initialMessage;
    }

    /// @notice 返回当前保存的消息。
    /// @return 合约中当前存储的最新消息内容。
    function message() external view returns (string memory) {
        return _message;
    }

    /// @notice 更新已存储的消息，并通过事件记录这次变更。
    /// @dev 这是一个示例合约，因此这里允许任意调用者修改消息。
    /// @param newMessage 需要写入的新消息内容。
    function setMessage(string calldata newMessage) external {
        string memory oldMessage = _message;
        _message = newMessage;
        emit MessageUpdated(oldMessage, newMessage, msg.sender);
    }
}
