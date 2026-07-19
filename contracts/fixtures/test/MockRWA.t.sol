// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {MockRWA} from "../src/MockRWA.sol";

contract MockRWATest is Test {
    MockRWA internal token;
    address internal admin = address(this);
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);

    function setUp() public {
        token = new MockRWA("RWA Token", "RWA");
        token.mint(alice, 1_000 ether);
    }

    function test_adminHasRoles() public view {
        assertTrue(token.hasRole(token.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(token.hasRole(token.MINTER_ROLE(), admin));
        assertTrue(token.hasRole(token.PAUSER_ROLE(), admin));
    }

    function test_mint_requiresMinterRole() public {
        // Read the role before pranking; `vm.prank` only affects the next call.
        bytes32 minterRole = token.MINTER_ROLE();
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(MockRWA.MissingRole.selector, minterRole, alice));
        token.mint(alice, 1 ether);
    }

    function test_grantRole_thenMint() public {
        token.grantRole(token.MINTER_ROLE(), alice);
        vm.prank(alice);
        token.mint(bob, 5 ether);
        assertEq(token.balanceOf(bob), 5 ether);
    }

    function test_pause_blocksTransfers() public {
        token.pause();
        assertTrue(token.paused());
        vm.prank(alice);
        vm.expectRevert(MockRWA.EnforcedPause.selector);
        token.transfer(bob, 1 ether);
    }

    function test_unpause_restoresTransfers() public {
        token.pause();
        token.unpause();
        vm.prank(alice);
        token.transfer(bob, 1 ether);
        assertEq(token.balanceOf(bob), 1 ether);
    }

    function test_renounceRole() public {
        token.renounceRole(token.PAUSER_ROLE(), admin);
        assertFalse(token.hasRole(token.PAUSER_ROLE(), admin));
    }
}
