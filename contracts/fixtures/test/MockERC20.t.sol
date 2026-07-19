// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract MockERC20Test is Test {
    MockERC20 internal token;
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);

    function setUp() public {
        token = new MockERC20("Fixture Token", "FIX", 18);
        token.mint(alice, 1_000 ether);
    }

    function test_metadata() public view {
        assertEq(token.name(), "Fixture Token");
        assertEq(token.symbol(), "FIX");
        assertEq(token.decimals(), 18);
    }

    function test_transfer() public {
        vm.prank(alice);
        token.transfer(bob, 100 ether);
        assertEq(token.balanceOf(bob), 100 ether);
        assertEq(token.balanceOf(alice), 900 ether);
    }

    function test_transfer_revertsOnInsufficientBalance() public {
        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(MockERC20.ERC20InsufficientBalance.selector, bob, 0, 1 ether)
        );
        token.transfer(alice, 1 ether);
    }

    function test_mint_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(MockERC20.NotOwner.selector, alice));
        token.mint(alice, 1 ether);
    }
}
