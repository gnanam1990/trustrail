// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";
import {TrancheVault} from "../src/TrancheVault.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address usdc = vm.envAddress("USDC_ADDRESS");
        // Verify the USDC token onchain before wiring the vault to it.
        uint8 dec = IERC20(usdc).decimals();
        require(dec == 6, "USDC_DECIMALS_MUST_BE_6");
        string memory sym = IERC20(usdc).symbol();
        require(keccak256(bytes(sym)) == keccak256(bytes("USDC")), "USDC_SYMBOL_MUST_BE_USDC");
        console2.log("USDC verified:", sym, "decimals:", dec);
        vm.startBroadcast(pk);
        TrancheVault v = new TrancheVault(IERC20(usdc));
        vm.stopBroadcast();
        console2.log("TrancheVault deployed at:", address(v));
    }
}
