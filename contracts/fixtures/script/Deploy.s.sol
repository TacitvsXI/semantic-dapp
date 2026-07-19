// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Counter} from "../src/Counter.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {MockVault} from "../src/MockVault.sol";
import {MockRWA} from "../src/MockRWA.sol";

/// @notice Deploys the fixture contracts to a local chain (Anvil) for demo/dev.
///         Usage: forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envOr(
            "PRIVATE_KEY",
            // Default Anvil account #0 private key.
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);

        Counter counter = new Counter();

        MockERC20 token = new MockERC20("Fixture Token", "FIX", 18);
        token.mint(deployer, 1_000_000 ether);

        MockVault vault = new MockVault(address(token), "Vault FIX", "vFIX");

        MockRWA rwa = new MockRWA("RWA Token", "RWA");
        rwa.mint(deployer, 1_000_000 ether);

        vm.stopBroadcast();

        console.log("Counter:", address(counter));
        console.log("MockERC20:", address(token));
        console.log("MockVault:", address(vault));
        console.log("MockRWA:", address(rwa));
        console.log("Deployer:", deployer);
    }
}
