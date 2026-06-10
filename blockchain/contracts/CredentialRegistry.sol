// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CredentialRegistry
 * @dev Manages the secure registration and verification of examination certificates on-chain.
 */
contract CredentialRegistry is Ownable {
    
    struct Credential {
        string certificateId;
        string firebaseUid;
        string certificateHash;
        string ipfsCid;
        uint256 issuedAt;
        address issuer;
    }

    // Mapping from Certificate ID to Credential details
    mapping(string => Credential) private credentials;

    // Mapping from Certificate File Hash (SHA-256) to Certificate ID
    mapping(string => string) private hashToId;

    // Event emitted when a credential is successfully registered on the blockchain
    event CredentialIssued(
        string indexed certificateId,
        string firebaseUid,
        string certificateHash,
        string ipfsCid,
        uint256 issuedAt
    );

    /**
     * @dev Constructor that sets the contract owner to the deployer.
     */
    constructor() Ownable(msg.sender) {}

    /**
     * @dev Issues a new credential. Only the contract owner (admin/institution) can issue.
     * @param _certificateId Unique identifier of the certificate
     * @param _firebaseUid Firebase User ID of the student
     * @param _certificateHash SHA-256 hash of the certificate PDF
     * @param _ipfsCid IPFS CID of the certificate PDF
     */
    function issueCredential(
        string calldata _certificateId,
        string calldata _firebaseUid,
        string calldata _certificateHash,
        string calldata _ipfsCid
    ) external onlyOwner {
        require(bytes(_certificateId).length > 0, "Certificate ID cannot be empty");
        require(bytes(_firebaseUid).length > 0, "Firebase UID cannot be empty");
        require(bytes(_certificateHash).length > 0, "Certificate hash cannot be empty");
        require(bytes(_ipfsCid).length > 0, "IPFS CID cannot be empty");

        // Duplicate checks
        require(credentials[_certificateId].issuedAt == 0, "Certificate already exists");
        require(bytes(hashToId[_certificateHash]).length == 0, "Hash already registered");

        // Store credential details
        credentials[_certificateId] = Credential({
            certificateId: _certificateId,
            firebaseUid: _firebaseUid,
            certificateHash: _certificateHash,
            ipfsCid: _ipfsCid,
            issuedAt: block.timestamp,
            issuer: msg.sender
        });

        // Store hash mapping
        hashToId[_certificateHash] = _certificateId;

        // Emit issuance event
        emit CredentialIssued(
            _certificateId,
            _firebaseUid,
            _certificateHash,
            _ipfsCid,
            block.timestamp
        );
    }

    /**
     * @dev Retrieves credential details by Certificate ID.
     */
    function getCredential(string calldata _certificateId) external view returns (Credential memory) {
        Credential memory cred = credentials[_certificateId];
        require(cred.issuedAt > 0, "Certificate does not exist");
        return cred;
    }

    /**
     * @dev Retrieves credential details by Certificate PDF Hash.
     */
    function getCredentialByHash(string calldata _certificateHash) external view returns (Credential memory) {
        string memory certId = hashToId[_certificateHash];
        require(bytes(certId).length > 0, "Certificate hash not registered");
        return credentials[certId];
    }

    /**
     * @dev Verifies if a certificate exists by its file hash.
     * @param _certificateHash The SHA-256 hash of the certificate PDF
     * @return verified True if verified, false otherwise
     * @return credential The credential details
     */
    function verifyCredential(string calldata _certificateHash) 
        external 
        view 
        returns (bool verified, Credential memory credential) 
    {
        string memory certId = hashToId[_certificateHash];
        if (bytes(certId).length == 0) {
            return (false, Credential("", "", "", "", 0, address(0)));
        }
        return (true, credentials[certId]);
    }
}
