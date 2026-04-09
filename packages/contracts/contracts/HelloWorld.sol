// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract HelloWorld {
    string private _message;
    address public immutable owner;

    event MessageUpdated(string oldMessage, string newMessage, address indexed updater);

    constructor(string memory initialMessage) {
        owner = msg.sender;
        _message = initialMessage;
    }

    function message() external view returns (string memory) {
        return _message;
    }

    function setMessage(string calldata newMessage) external {
        string memory oldMessage = _message;
        _message = newMessage;
        emit MessageUpdated(oldMessage, newMessage, msg.sender);
    }
}
