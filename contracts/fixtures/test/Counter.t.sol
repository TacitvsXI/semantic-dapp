// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Counter} from "../src/Counter.sol";

contract CounterTest is Test {
    Counter internal counter;

    function setUp() public {
        counter = new Counter();
    }

    function test_increment() public {
        counter.increment();
        assertEq(counter.number(), 1);
    }

    function test_setNumber() public {
        counter.setNumber(42);
        assertEq(counter.number(), 42);
    }

    function test_setNumber_revertsAboveMax() public {
        vm.expectRevert(abi.encodeWithSelector(Counter.ValueTooLarge.selector, 1_000_001, counter.MAX()));
        counter.setNumber(1_000_001);
    }
}
