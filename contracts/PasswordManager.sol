// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PasswordManager {
    struct PasswordEntry {
        string website;
        string username;
        string encryptedPassword;
        string iv; // Initialization vector for decryption
    }
    
    // Mapping from user address to their password entries
    mapping(address => PasswordEntry[]) private userPasswords;
    
    event PasswordStored(address indexed user, string website);
    
    function storePassword(
        string memory _website,
        string memory _username,
        string memory _encryptedPassword,
        string memory _iv
    ) public {
        userPasswords[msg.sender].push(PasswordEntry(
            _website,
            _username,
            _encryptedPassword,
            _iv
        ));
        emit PasswordStored(msg.sender, _website);
    }
    
    function getPasswordCount() public view returns (uint) {
        return userPasswords[msg.sender].length;
    }
    
    function getPasswordEntry(uint index) public view returns (
        string memory website,
        string memory username,
        string memory encryptedPassword,
        string memory iv
    ) {
        PasswordEntry storage entry = userPasswords[msg.sender][index];
        return (
            entry.website,
            entry.username,
            entry.encryptedPassword,
            entry.iv
        );
    }
}