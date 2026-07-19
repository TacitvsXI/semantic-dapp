// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title MockRWA
/// @notice Self-contained role-gated ERC-20 modeling an RWA / stablecoin admin
///         surface: AccessControl-style roles + Pausable + mint/burn. Simplified
///         (hand-rolled AccessControl) and for analyzer detection / demos only.
contract MockRWA {
    /* ------------------------------ ERC-20 ------------------------------ */

    string public name;
    string public symbol;
    uint8 public constant decimals = 18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /* --------------------------- AccessControl -------------------------- */

    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    mapping(bytes32 => mapping(address => bool)) private _roles;
    mapping(bytes32 => bytes32) private _roleAdmin;

    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    /* ------------------------------ Pausable ---------------------------- */

    bool public paused;

    event Paused(address account);
    event Unpaused(address account);

    /* ------------------------------ errors ------------------------------ */

    error MissingRole(bytes32 role, address account);
    error EnforcedPause();
    error InsufficientBalance();
    error InsufficientAllowance();

    modifier onlyRole(bytes32 role) {
        if (!_roles[role][msg.sender]) revert MissingRole(role, msg.sender);
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert EnforcedPause();
        _;
    }

    constructor(string memory name_, string memory symbol_) {
        name = name_;
        symbol = symbol_;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    /* ---------------------------- ERC-20 logic -------------------------- */

    function transfer(address to, uint256 value) external whenNotPaused returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value)
        external
        whenNotPaused
        returns (bool)
    {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            if (allowed < value) revert InsufficientAllowance();
            allowance[from][msg.sender] = allowed - value;
        }
        _transfer(from, to, value);
        return true;
    }

    /// @notice Mint new tokens. Requires MINTER_ROLE.
    function mint(address to, uint256 value) external onlyRole(MINTER_ROLE) {
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }

    /// @notice Burn tokens from an account. Requires MINTER_ROLE.
    function burn(address from, uint256 value) external onlyRole(MINTER_ROLE) {
        uint256 balance = balanceOf[from];
        if (balance < value) revert InsufficientBalance();
        unchecked {
            balanceOf[from] = balance - value;
            totalSupply -= value;
        }
        emit Transfer(from, address(0), value);
    }

    /* -------------------------- AccessControl API ----------------------- */

    function hasRole(bytes32 role, address account) public view returns (bool) {
        return _roles[role][account];
    }

    function getRoleAdmin(bytes32 role) public view returns (bytes32) {
        return _roleAdmin[role];
    }

    function grantRole(bytes32 role, address account) external onlyRole(getRoleAdmin(role)) {
        _grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) external onlyRole(getRoleAdmin(role)) {
        _revokeRole(role, account);
    }

    function renounceRole(bytes32 role, address account) external {
        if (account != msg.sender) revert MissingRole(role, msg.sender);
        _revokeRole(role, account);
    }

    /* ------------------------------ Pausable ---------------------------- */

    /// @notice Halt transfers. Requires PAUSER_ROLE.
    function pause() external onlyRole(PAUSER_ROLE) {
        paused = true;
        emit Paused(msg.sender);
    }

    /// @notice Resume transfers. Requires PAUSER_ROLE.
    function unpause() external onlyRole(PAUSER_ROLE) {
        paused = false;
        emit Unpaused(msg.sender);
    }

    /* ----------------------------- internals ---------------------------- */

    function _transfer(address from, address to, uint256 value) internal {
        uint256 balance = balanceOf[from];
        if (balance < value) revert InsufficientBalance();
        unchecked {
            balanceOf[from] = balance - value;
            balanceOf[to] += value;
        }
        emit Transfer(from, to, value);
    }

    function _grantRole(bytes32 role, address account) internal {
        if (!_roles[role][account]) {
            _roles[role][account] = true;
            emit RoleGranted(role, account, msg.sender);
        }
    }

    function _revokeRole(bytes32 role, address account) internal {
        if (_roles[role][account]) {
            _roles[role][account] = false;
            emit RoleRevoked(role, account, msg.sender);
        }
    }
}
