// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Counter
/// @notice Minimal fixture contract exercising view/write functions and a custom error.
contract Counter {
    /// @notice The current stored number.
    uint256 public number;

    /// @notice Emitted whenever {number} changes.
    event NumberChanged(uint256 newValue);

    /// @notice Thrown when a caller tries to set a value above the allowed maximum.
    error ValueTooLarge(uint256 provided, uint256 max);

    uint256 public constant MAX = 1_000_000;

    /// @notice Set the stored number.
    /// @param newNumber The value to store (must be <= {MAX}).
    function setNumber(uint256 newNumber) external {
        if (newNumber > MAX) revert ValueTooLarge(newNumber, MAX);
        number = newNumber;
        emit NumberChanged(newNumber);
    }

    /// @notice Increment the stored number by one.
    function increment() external {
        number += 1;
        emit NumberChanged(number);
    }
}
