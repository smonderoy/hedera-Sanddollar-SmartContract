// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract Vault is Ownable {
    mapping(address => uint256) public balances;
    uint256 public balance;

    event HBARDeposited(uint256 amount);
    event TokenDeposited(address tokenAddress, uint256 amount);

    event HBARTransferredTo(address to, uint256 amount);
    event HBARTransferredFrom(address from, uint256 amount);

    event TokenTransferredTo(address to, address tokenAddress, uint256 amount);
    event TokenTransferredFrom(
        address from,
        address tokenAddress,
        uint256 amount
    );

    event HBARWithdrawn(uint256 amount);
    event TokenWithdrawn(address tokenAddress, uint256 amount);

    event Swapped(
        address token1Address,
        uint256 amount1,
        address token2Address,
        uint256 amount2,
        address to
    );

    constructor() Ownable(msg.sender) {}

    function depositHBAR() public payable {
        require(msg.value > 0, "Deposit amount smaller than 0");

        balance += msg.value;

        emit HBARDeposited(msg.value);
    }

    function depositToken(
        address tokenAddress,
        uint256 amount
    ) external onlyOwner {
        require(amount > 0, "Deposit amount smaller than 0");

        ERC20 token = ERC20(tokenAddress);
        // Ensure the owner has approved this contract to spend tokens
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Failed to transfer tokens from sender"
        );

        balances[tokenAddress] += amount;

        emit TokenDeposited(tokenAddress, amount);
    }

    function transferHBARToUser(address to, uint256 amount) public onlyOwner {
        require(amount > 0 && amount <= balance, "Invalid transfer amount");

        balance -= amount;
        payable(to).transfer(amount);

        emit HBARTransferredTo(to, amount);
    }

    function transferHBARFromUser() public payable {
        require(msg.value > 0, "Transfer amount smaller than 0");

        balance += msg.value;

        emit HBARTransferredFrom(msg.sender, msg.value);
    }

    function transferTokenToUser(
        address to,
        address tokenAddress,
        uint256 amount
    ) public onlyOwner {
        require(balances[tokenAddress] >= amount, "Insufficient balance");

        ERC20 token = ERC20(tokenAddress);

        require(
            token.transfer(to, amount),
            "Failed to transfer tokens to user"
        );

        balances[tokenAddress] -= amount;

        emit TokenTransferredTo(to, tokenAddress, amount);
    }

    function transferTokenFromUser(
        address from,
        address tokenAddress,
        uint256 amount
    ) public onlyOwner {
        ERC20 token = ERC20(tokenAddress);

        require(
            token.transferFrom(from, address(this), amount),
            "Failed to transfer tokens to user"
        );

        balances[tokenAddress] += amount;

        emit TokenTransferredFrom(from, address(this), amount);
    }

    function swap(
        address token1Address,
        uint256 amount1,
        address token2Address,
        uint256 amount2,
        address to
    ) external onlyOwner {
        transferTokenFromUser(to, token1Address, amount1);
        transferTokenToUser(to, token2Address, amount2);

        emit Swapped(token1Address, amount1, token2Address, amount2, to);
    }

    // Only the owner can withdraw HBAR from this contract
    function withdrawHBAR(uint256 amount) external onlyOwner {
        require(amount > 0 && amount <= balance, "Invalid withdrawal amount");

        (bool success, ) = payable(owner()).call{value: amount}("");

        require(success, "HBAR transfer failed");

        balance -= amount;

        emit HBARWithdrawn(amount);
    }

    // Only the owner can withdraw tokens from this contract
    function withdrawToken(
        address tokenAddress,
        uint256 amount
    ) external onlyOwner {
        require(amount > 0, "Withdraw amount smaller than 0");
        require(balances[tokenAddress] >= amount, "Insufficient balance");

        ERC20 token = ERC20(tokenAddress);
        require(
            token.transfer(owner(), amount),
            "Failed to transfer tokens to owner"
        );

        balances[tokenAddress] -= amount;

        emit TokenWithdrawn(tokenAddress, amount);
    }
}
