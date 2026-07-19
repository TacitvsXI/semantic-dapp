// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title MockERC20
/// @notice Self-contained ERC-20 fixture with mint, used for analyzer detection
///         and end-to-end read/write integration tests. Not for production use.
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public immutable decimals;

    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    address public owner;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /// @notice Thrown when an account has insufficient balance for a transfer.
    error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed);
    /// @notice Thrown when a spender tries to move more than the approved allowance.
    error ERC20InsufficientAllowance(address spender, uint256 allowanceLeft, uint256 needed);
    /// @notice Thrown when a caller lacks the owner role.
    error NotOwner(address caller);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner(msg.sender);
        _;
    }

    constructor(string memory name_, string memory symbol_, uint8 decimals_) {
        name = name_;
        symbol = symbol_;
        decimals = decimals_;
        owner = msg.sender;
    }

    /// @notice Transfer `value` tokens to `to`.
    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    /// @notice Approve `spender` to move `value` tokens on your behalf.
    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    /// @notice Move `value` tokens from `from` to `to` using an allowance.
    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed < value) revert ERC20InsufficientAllowance(msg.sender, allowed, value);
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - value;
        }
        _transfer(from, to, value);
        return true;
    }

    /// @notice Mint `value` new tokens to `to`. Owner only.
    function mint(address to, uint256 value) external onlyOwner {
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }

    function _transfer(address from, address to, uint256 value) internal {
        uint256 balance = balanceOf[from];
        if (balance < value) revert ERC20InsufficientBalance(from, balance, value);
        unchecked {
            balanceOf[from] = balance - value;
            balanceOf[to] += value;
        }
        emit Transfer(from, to, value);
    }
}
