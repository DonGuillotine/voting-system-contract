// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract DecentralizedVoting is AccessControl, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    struct Proposal {
        uint256 id;
        string description;
        uint256 voteCount;
        address proposer;
    }

    uint256 private _nextProposalId = 1;
    mapping(uint256 => Proposal) public proposals;
    mapping(address => bool) public hasVoted;

    uint256 public votingStart;
    uint256 public votingEnd;
    bool public votingFinalized;

    event ProposalSubmitted(uint256 indexed proposalId, string description, address proposer);
    event Voted(address indexed voter, uint256 indexed proposalId);
    event VotingStarted(uint256 startTime, uint256 endTime);
    event VotingEnded(uint256 winningProposalId);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function submitProposal(string memory description) external whenNotPaused {
        require(votingStart == 0, "Voting has already started");
        
        uint256 newProposalId = _nextProposalId++;

        proposals[newProposalId] = Proposal({
            id: newProposalId,
            description: description,
            voteCount: 0,
            proposer: msg.sender
        });

        emit ProposalSubmitted(newProposalId, description, msg.sender);
    }

    function startVoting(uint256 durationInMinutes) external onlyRole(ADMIN_ROLE) {
        require(votingStart == 0, "Voting has already started");
        require(durationInMinutes > 0, "Voting duration must be positive");

        votingStart = block.timestamp;
        votingEnd = votingStart + (durationInMinutes * 1 minutes);

        emit VotingStarted(votingStart, votingEnd);
    }

    function vote(uint256 proposalId) external whenNotPaused {
        require(votingStart != 0 && block.timestamp >= votingStart, "Voting has not started");
        require(block.timestamp <= votingEnd, "Voting has ended");
        require(!hasVoted[msg.sender], "You have already voted");
        require(proposals[proposalId].id != 0, "Invalid proposal");

        hasVoted[msg.sender] = true;
        proposals[proposalId].voteCount++;

        emit Voted(msg.sender, proposalId);
    }

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        require(proposals[proposalId].id != 0, "Invalid proposal");
        return proposals[proposalId];
    }

    function getVotingStatus() external view returns (
        uint256 timeRemaining,
        uint256 totalVotes,
        uint256 proposalCount
    ) {
        if (block.timestamp < votingEnd) {
            timeRemaining = votingEnd - block.timestamp;
        }
        
        totalVotes = 0;
        for (uint256 i = 1; i < _nextProposalId; i++) {
            totalVotes += proposals[i].voteCount;
        }
        
        proposalCount = _nextProposalId - 1;
    }

    function finalizeVoting() external onlyRole(ADMIN_ROLE) {
        require(block.timestamp > votingEnd, "Voting period has not ended");
        require(!votingFinalized, "Voting has already been finalized");

        uint256 winningProposalId = 0;
        uint256 winningVoteCount = 0;

        for (uint256 i = 1; i < _nextProposalId; i++) {
            if (proposals[i].voteCount > winningVoteCount) {
                winningVoteCount = proposals[i].voteCount;
                winningProposalId = i;
            }
        }

        votingFinalized = true;
        emit VotingEnded(winningProposalId);
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}