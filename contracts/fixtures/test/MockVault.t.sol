// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {MockVault} from "../src/MockVault.sol";

contract MockVaultTest is Test {
    MockERC20 internal assetToken;
    MockVault internal vault;
    address internal alice = address(0xA11CE);

    function setUp() public {
        assetToken = new MockERC20("Asset", "AST", 18);
        vault = new MockVault(address(assetToken), "Vault Asset", "vAST");
        assetToken.mint(alice, 1_000 ether);
    }

    function test_metadata() public view {
        assertEq(vault.asset(), address(assetToken));
        assertEq(vault.symbol(), "vAST");
    }

    function test_depositMintsSharesOneToOne() public {
        vm.startPrank(alice);
        assetToken.approve(address(vault), 100 ether);
        uint256 shares = vault.deposit(100 ether, alice);
        vm.stopPrank();

        assertEq(shares, 100 ether);
        assertEq(vault.balanceOf(alice), 100 ether);
        assertEq(vault.totalAssets(), 100 ether);
    }

    function test_redeemReturnsAssets() public {
        vm.startPrank(alice);
        assetToken.approve(address(vault), 100 ether);
        vault.deposit(100 ether, alice);
        uint256 assets = vault.redeem(40 ether, alice, alice);
        vm.stopPrank();

        assertEq(assets, 40 ether);
        assertEq(vault.balanceOf(alice), 60 ether);
        assertEq(assetToken.balanceOf(alice), 940 ether);
    }

    function test_withdrawBurnsShares() public {
        vm.startPrank(alice);
        assetToken.approve(address(vault), 100 ether);
        vault.deposit(100 ether, alice);
        uint256 shares = vault.withdraw(25 ether, alice, alice);
        vm.stopPrank();

        assertEq(shares, 25 ether);
        assertEq(vault.balanceOf(alice), 75 ether);
    }
}
