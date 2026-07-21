// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Counter} from "../src/Counter.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {MockVault} from "../src/MockVault.sol";
import {MockRWA} from "../src/MockRWA.sol";

/// @notice Deploys the fixture contracts for demo/dev.
///
/// Local (Anvil, default account #0):
///   forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
///
/// Public testnet (e.g. Sepolia / Base Sepolia) so the demos work without a
/// local node - fund the deployer first, then:
///   PRIVATE_KEY=0x<funded-key> forge script script/Deploy.s.sol \
///     --rpc-url "$SEPOLIA_RPC_URL" --broadcast \
///     --verify --etherscan-api-key "$ETHERSCAN_API_KEY"
///
/// See docs/demos.md ("Deploy the demos to a public testnet") for the full flow,
/// including how to load the deployed addresses into the Studio or a bundle.
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
