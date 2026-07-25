// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "forge-std/interfaces/IERC20.sol";

/// @dev Minimal safe-transfer wrapper for USDC-shaped ERC20s.
library SafeTransferLib {
    error TransferFailed();
    function safeTransferFrom(IERC20 token, address from, address to, uint256 amount) internal {
        (bool ok, bytes memory data) = address(token).call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, amount)
        );
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }
    function safeTransfer(IERC20 token, address to, uint256 amount) internal {
        (bool ok, bytes memory data) = address(token).call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, amount)
        );
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }
}

/// @title TrancheVault
/// @notice TrustRail — neutral proof-gated disbursement rail for humanitarian aid.
///
/// Per campaign:
///   - One NGO is registered as the release destination.
///   - N tranches are defined at creation. Total amount is the sum of tranche amounts.
///   - Tranche 0 unlocks immediately on funding. Tranche k unlocks only after tranche
///     (k-1) has been confirmed by the configured M-of-N attestor threshold.
///   - Donor can reclaim any tranche whose grace period has elapsed without a valid
///     proof-of-distribution being confirmed.
///
/// Invariants (encoded as tests in test/TrancheVault.t.sol):
///   1. Tranche N+1 is unreachable until tranche N's proof has been confirmed
///      by the configured M-of-N threshold.
///   2. Funds release ONLY to the registered NGO address for that campaign.
///   3. An unclaimed tranche is reclaimable by the donor ONLY after its grace
///      period has elapsed with no valid proof confirmed.
///   4. M-of-N attestor confirmation requires DISTINCT attestor addresses —
///      no double-counting one attestor's confirmation.
///   5. Conservation: total released + total reclaimed never exceeds total funded.
contract TrancheVault {
    using SafeTransferLib for IERC20;

    enum TrancheState { Locked, ProofSubmitted, Confirmed, Claimed, Reclaimed }

    struct Tranche {
        uint96  amount;            // 6dp USDC
        uint64  gracePeriod;       // seconds the NGO has to confirm proof before donor can reclaim
        uint64  unlockAt;          // set when prior tranche is confirmed; 0 if not yet unlocked
        uint64  proofSubmittedAt;  // 0 if no proof yet
        TrancheState state;
        bytes32 proofHash;
        uint256 confirmationCount; // count of distinct attestor confirmations
    }

    struct Campaign {
        address donor;
        address ngo;
        uint256 trancheCount;
        uint256 threshold;          // required M-of-N
        Tranche[] tranches;
    }

    struct AttestorConfirmation {
        bool confirmed;
    }

    IERC20 public immutable usdc;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(uint256 => mapping(address => AttestorConfirmation)))
        public trancheAttestorConfirmations; // campaignId -> trancheIndex -> attestor -> confirmed

    // ------------------------------------------------------------------
    // Events
    // ------------------------------------------------------------------

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed donor,
        address indexed ngo,
        uint256 trancheCount,
        uint256 threshold
    );
    event TrancheUnlocked(uint256 indexed campaignId, uint256 indexed trancheIndex);
    event ProofSubmitted(uint256 indexed campaignId, uint256 indexed trancheIndex, bytes32 proofHash, uint256 recipientCount);
    event ProofConfirmed(uint256 indexed campaignId, uint256 indexed trancheIndex, address indexed attestor);
    event TrancheClaimed(uint256 indexed campaignId, uint256 indexed trancheIndex, address indexed ngo, uint96 amount);
    event TrancheReclaimed(uint256 indexed campaignId, uint256 indexed trancheIndex, address indexed donor, uint96 amount);

    // ------------------------------------------------------------------
    // Errors
    // ------------------------------------------------------------------

    error UnknownCampaign();
    error UnknownTranche();
    error ZeroAddress();
    error InvalidThreshold();
    error EmptyTranches();
    error TrancheLocked();
    error AlreadyConfirmed();
    error NotAttestor();
    error NotDonor();
    error NotNGO();
    error TrancheNotClaimable();
    error NotUnlocked();
    error GraceNotElapsed();
    error ProofAlreadySubmitted();
    error ThresholdNotMet();
    error NoProof();
    error NotAttestorForTranche();

    // ------------------------------------------------------------------
    // Construction
    // ------------------------------------------------------------------

    constructor(IERC20 _usdc) {
        if (address(_usdc) == address(0)) revert ZeroAddress();
        usdc = _usdc;
    }

    // ------------------------------------------------------------------
    // Campaign creation
    // ------------------------------------------------------------------

    /// @param attestors List of attestor addresses for M-of-N confirmation. Length must
    ///                   be >= threshold and > 0.
    function createCampaign(
        uint256 campaignId,
        address ngo,
        uint96[] calldata trancheAmounts,
        uint64[] calldata gracePeriods,
        address[] calldata attestors,
        uint256 threshold
    ) external {
        if (campaigns[campaignId].donor != address(0)) revert UnknownCampaign();
        if (ngo == address(0)) revert ZeroAddress();
        if (trancheAmounts.length == 0) revert EmptyTranches();
        if (trancheAmounts.length != gracePeriods.length) revert UnknownTranche();
        if (attestors.length == 0 || threshold == 0 || threshold > attestors.length) {
            revert InvalidThreshold();
        }

        Campaign storage c = campaigns[campaignId];
        c.donor = msg.sender;
        c.ngo = ngo;
        c.trancheCount = trancheAmounts.length;
        c.threshold = threshold;

        uint256 totalAmount;
        for (uint256 i = 0; i < trancheAmounts.length; i++) {
            Tranche storage t = c.tranches.push();
            t.amount = trancheAmounts[i];
            t.gracePeriod = gracePeriods[i];
            totalAmount += trancheAmounts[i];
        }
        // Tranche 0 is unlocked on funding; rest unlock as prior tranches confirm.
        c.tranches[0].unlockAt = uint64(block.timestamp);

        // Register attestors
        for (uint256 i = 0; i < attestors.length; i++) {
            if (attestors[i] == address(0)) revert ZeroAddress();
            campaignAttestors[campaignId].push(attestors[i]);
        }

        usdc.safeTransferFrom(msg.sender, address(this), totalAmount);

        emit CampaignCreated(campaignId, msg.sender, ngo, trancheAmounts.length, threshold);
        emit TrancheUnlocked(campaignId, 0);
    }

    // ------------------------------------------------------------------
    // Proof submission
    // ------------------------------------------------------------------

    /// @notice NGO submits a proof-of-distribution for a tranche.
    function submitProof(
        uint256 campaignId,
        uint256 trancheIndex,
        bytes32 proofHash,
        uint256 /* recipientCount */
    ) external {
        Campaign storage c = _campaign(campaignId);
        if (trancheIndex >= c.trancheCount) revert UnknownTranche();
        if (msg.sender != c.ngo) revert NotNGO();
        Tranche storage t = c.tranches[trancheIndex];
        if (t.state != TrancheState.Locked) revert ProofAlreadySubmitted();
        if (t.unlockAt == 0 || block.timestamp < t.unlockAt) revert NotUnlocked();

        t.proofHash = proofHash;
        t.proofSubmittedAt = uint64(block.timestamp);
        t.state = TrancheState.ProofSubmitted;

        emit ProofSubmitted(campaignId, trancheIndex, proofHash, 0);
    }

    // ------------------------------------------------------------------
    // Attestor confirmation (M-of-N)
    // ------------------------------------------------------------------

    function confirmProof(uint256 campaignId, uint256 trancheIndex) external {
        Campaign storage c = _campaign(campaignId);
        if (trancheIndex >= c.trancheCount) revert UnknownTranche();
        Tranche storage t = c.tranches[trancheIndex];
        if (t.state != TrancheState.ProofSubmitted) revert NoProof();

        // The attestor must be allowlisted for this campaign; we model allowlist via
        // the storage cell (caller registered at createCampaign time is the canonical
        // list, indexed 0..N-1 by storage layout). We validate by checking that this
        // caller has a confirmation cell that is not yet true.
        // Allowlist check: a separate "attestor allowlist" mapping is provided below.
        if (!isAttestor(campaignId, msg.sender)) revert NotAttestorForTranche();
        if (trancheAttestorConfirmations[campaignId][trancheIndex][msg.sender].confirmed) {
            revert AlreadyConfirmed();
        }

        trancheAttestorConfirmations[campaignId][trancheIndex][msg.sender].confirmed = true;
        t.confirmationCount += 1;

        emit ProofConfirmed(campaignId, trancheIndex, msg.sender);

        if (t.confirmationCount >= c.threshold) {
            t.state = TrancheState.Confirmed;
            // Unlock next tranche
            if (trancheIndex + 1 < c.trancheCount) {
                c.tranches[trancheIndex + 1].unlockAt = uint64(block.timestamp);
                emit TrancheUnlocked(campaignId, trancheIndex + 1);
            }
        }
    }

    // ------------------------------------------------------------------
    // Claim / reclaim
    // ------------------------------------------------------------------

    /// @notice NGO claims a confirmed tranche.
    function claimTranche(uint256 campaignId, uint256 trancheIndex) external {
        Campaign storage c = _campaign(campaignId);
        if (trancheIndex >= c.trancheCount) revert UnknownTranche();
        if (msg.sender != c.ngo) revert NotNGO();
        Tranche storage t = c.tranches[trancheIndex];
        if (t.state != TrancheState.Confirmed) revert TrancheNotClaimable();

        t.state = TrancheState.Claimed;
        usdc.safeTransfer(c.ngo, t.amount);

        emit TrancheClaimed(campaignId, trancheIndex, c.ngo, t.amount);
    }

    /// @notice Donor reclaims an unclaimed tranche whose grace period has elapsed
    ///         without a confirmed proof.
    function reclaimExpired(uint256 campaignId, uint256 trancheIndex) external {
        Campaign storage c = _campaign(campaignId);
        if (trancheIndex >= c.trancheCount) revert UnknownTranche();
        if (msg.sender != c.donor) revert NotDonor();
        Tranche storage t = c.tranches[trancheIndex];
        if (t.state != TrancheState.Locked && t.state != TrancheState.ProofSubmitted) {
            revert TrancheNotClaimable();
        }

        // Grace period starts when the tranche unlocks. For tranche 0, that's funding time.
        uint64 graceStart = t.unlockAt;
        if (block.timestamp <= graceStart + t.gracePeriod) revert GraceNotElapsed();

        t.state = TrancheState.Reclaimed;
        usdc.safeTransfer(c.donor, t.amount);

        emit TrancheReclaimed(campaignId, trancheIndex, c.donor, t.amount);
    }

    // ------------------------------------------------------------------
    // Attestor registry
    // ------------------------------------------------------------------

    mapping(uint256 => address[]) public campaignAttestors;

    function getCampaignAttestors(uint256 campaignId) external view returns (address[] memory) {
        return campaignAttestors[campaignId];
    }

    function isAttestor(uint256 campaignId, address who) public view returns (bool) {
        address[] storage addrs = campaignAttestors[campaignId];
        for (uint256 i = 0; i < addrs.length; i++) {
            if (addrs[i] == who) return true;
        }
        return false;
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------

    function getTranche(uint256 campaignId, uint256 trancheIndex) external view returns (Tranche memory) {
        return campaigns[campaignId].tranches[trancheIndex];
    }

    function getCampaign(uint256 campaignId) external view returns (Campaign memory) {
        return campaigns[campaignId];
    }

    // ------------------------------------------------------------------
    // Internal
    // ------------------------------------------------------------------

    function _campaign(uint256 id) internal view returns (Campaign storage) {
        Campaign storage c = campaigns[id];
        if (c.donor == address(0)) revert UnknownCampaign();
        return c;
    }
}
