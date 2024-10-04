const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DecentralizedVoting", function () {
  let DecentralizedVoting;
  let decentralizedVoting;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    DecentralizedVoting = await ethers.getContractFactory("DecentralizedVoting");
    decentralizedVoting = await DecentralizedVoting.deploy();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await decentralizedVoting.hasRole(await decentralizedVoting.DEFAULT_ADMIN_ROLE(), owner.address)).to.equal(true);
    });
  });

  describe("Proposal submission", function () {
    it("Should allow users to submit proposals", async function () {
      await decentralizedVoting.connect(addr1).submitProposal("Proposal 1");
      const proposal = await decentralizedVoting.getProposal(1);
      expect(proposal.description).to.equal("Proposal 1");
      expect(proposal.proposer).to.equal(addr1.address);
    });

    it("Should not allow proposal submission after voting starts", async function () {
      await decentralizedVoting.connect(owner).startVoting(60);
      await expect(decentralizedVoting.connect(addr1).submitProposal("Late Proposal"))
        .to.be.revertedWith("Voting has already started");
    });
  });

  describe("Voting", function () {
    beforeEach(async function () {
      await decentralizedVoting.connect(addr1).submitProposal("Proposal 1");
      await decentralizedVoting.connect(addr2).submitProposal("Proposal 2");
      await decentralizedVoting.connect(owner).startVoting(60);
    });

    it("Should allow users to vote", async function () {
      await decentralizedVoting.connect(addr1).vote(1);
      const proposal = await decentralizedVoting.getProposal(1);
      expect(proposal.voteCount).to.equal(1);
    });

    it("Should not allow users to vote twice", async function () {
      await decentralizedVoting.connect(addr1).vote(1);
      await expect(decentralizedVoting.connect(addr1).vote(2))
        .to.be.revertedWith("You have already voted");
    });
  });

  describe("Finalization", function () {
    beforeEach(async function () {
      await decentralizedVoting.connect(addr1).submitProposal("Proposal 1");
      await decentralizedVoting.connect(addr2).submitProposal("Proposal 2");
      await decentralizedVoting.connect(owner).startVoting(60);
    });

    it("Should not allow finalization before voting ends", async function () {
      await expect(decentralizedVoting.connect(owner).finalizeVoting())
        .to.be.revertedWith("Voting period has not ended");
    });

    it("Should allow finalization after voting ends", async function () {
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");

      await decentralizedVoting.connect(owner).finalizeVoting();
      expect(await decentralizedVoting.votingFinalized()).to.equal(true);
    });
  });
});