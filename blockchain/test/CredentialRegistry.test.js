const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CredentialRegistry", function () {
  let CredentialRegistry;
  let registry;
  let owner;
  let nonOwner;

  const certificateId = "CERT-2026-001";
  const firebaseUid = "usr_student123";
  const certificateHash = "6e34ac8a9d458641a9bb7538a7bde25df963c87e076615b5eb0bc23b20757a3e";
  const ipfsCid = "QmZt8LzN23tG9hN6r4mFvWnLopq1234abc";

  beforeEach(async function () {
    // Get signers
    [owner, nonOwner] = await ethers.getSigners();

    // Deploy contract
    CredentialRegistry = await ethers.getContractFactory("CredentialRegistry");
    registry = await CredentialRegistry.deploy();
    await registry.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await registry.owner()).to.equal(owner.address);
    });
  });

  describe("Issuance", function () {
    it("Should allow owner to issue a credential", async function () {
      await expect(
        registry.connect(owner).issueCredential(
          certificateId,
          firebaseUid,
          certificateHash,
          ipfsCid
        )
      )
        .to.emit(registry, "CredentialIssued")
        .withArgs(certificateId, firebaseUid, certificateHash, ipfsCid, anyTimestamp => anyTimestamp > 0);

      const credential = await registry.getCredential(certificateId);
      expect(credential.certificateId).to.equal(certificateId);
      expect(credential.firebaseUid).to.equal(firebaseUid);
      expect(credential.certificateHash).to.equal(certificateHash);
      expect(credential.ipfsCid).to.equal(ipfsCid);
      expect(credential.issuer).to.equal(owner.address);
    });

    it("Should prevent non-owners from issuing credentials", async function () {
      await expect(
        registry.connect(nonOwner).issueCredential(
          certificateId,
          firebaseUid,
          certificateHash,
          ipfsCid
        )
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });

    it("Should prevent duplicate Certificate ID issuance", async function () {
      // First issuance
      await registry.connect(owner).issueCredential(
        certificateId,
        firebaseUid,
        certificateHash,
        ipfsCid
      );

      // Try duplicate ID, different hash
      const differentHash = "7e34ac8a9d458641a9bb7538a7bde25df963c87e076615b5eb0bc23b20757a3e";
      await expect(
        registry.connect(owner).issueCredential(
          certificateId,
          firebaseUid,
          differentHash,
          ipfsCid
        )
      ).to.be.revertedWith("Certificate already exists");
    });

    it("Should prevent duplicate Certificate Hash issuance", async function () {
      // First issuance
      await registry.connect(owner).issueCredential(
        certificateId,
        firebaseUid,
        certificateHash,
        ipfsCid
      );

      // Try different ID, duplicate hash
      const differentId = "CERT-2026-002";
      await expect(
        registry.connect(owner).issueCredential(
          differentId,
          firebaseUid,
          certificateHash,
          ipfsCid
        )
      ).to.be.revertedWith("Hash already registered");
    });

    it("Should prevent empty values", async function () {
      await expect(
        registry.connect(owner).issueCredential("", firebaseUid, certificateHash, ipfsCid)
      ).to.be.revertedWith("Certificate ID cannot be empty");

      await expect(
        registry.connect(owner).issueCredential(certificateId, "", certificateHash, ipfsCid)
      ).to.be.revertedWith("Firebase UID cannot be empty");

      await expect(
        registry.connect(owner).issueCredential(certificateId, firebaseUid, "", ipfsCid)
      ).to.be.revertedWith("Certificate hash cannot be empty");

      await expect(
        registry.connect(owner).issueCredential(certificateId, firebaseUid, certificateHash, "")
      ).to.be.revertedWith("IPFS CID cannot be empty");
    });
  });

  describe("Queries and Verification", function () {
    beforeEach(async function () {
      await registry.connect(owner).issueCredential(
        certificateId,
        firebaseUid,
        certificateHash,
        ipfsCid
      );
    });

    it("Should retrieve credential by Certificate ID", async function () {
      const credential = await registry.getCredential(certificateId);
      expect(credential.firebaseUid).to.equal(firebaseUid);
      expect(credential.certificateHash).to.equal(certificateHash);
    });

    it("Should revert when querying non-existent Certificate ID", async function () {
      await expect(registry.getCredential("NON_EXISTENT")).to.be.revertedWith(
        "Certificate does not exist"
      );
    });

    it("Should retrieve credential by Certificate Hash", async function () {
      const credential = await registry.getCredentialByHash(certificateHash);
      expect(credential.certificateId).to.equal(certificateId);
      expect(credential.firebaseUid).to.equal(firebaseUid);
    });

    it("Should revert when querying unregistered Certificate Hash", async function () {
      await expect(registry.getCredentialByHash("unregistered_hash")).to.be.revertedWith(
        "Certificate hash not registered"
      );
    });

    it("Should verify existing credentials correctly", async function () {
      const [verified, credential] = await registry.verifyCredential(certificateHash);
      expect(verified).to.be.true;
      expect(credential.certificateId).to.equal(certificateId);
      expect(credential.firebaseUid).to.equal(firebaseUid);
    });

    it("Should return false and empty credential for non-existent hash", async function () {
      const [verified, credential] = await registry.verifyCredential("random_hash");
      expect(verified).to.be.false;
      expect(credential.certificateId).to.equal("");
      expect(credential.issuedAt).to.equal(0);
    });
  });
});
