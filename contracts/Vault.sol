// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.5.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "./HTS/IHederaTokenService.sol";
import "./HTS/HederaResponseCodes.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract Vault is Ownable {
    address constant precompileAddress = address(0x167);

    mapping(address => uint256) public balances;
    uint256 public balance;

    event HBARDeposited(uint256 amount);
    event TokenDeposited(address tokenAddress, uint256 amount);

    event HBARTransferredTo(address to, uint256 amount);
    event HBARTransferredFrom(address from, uint256 amount);

    event TokenTransferred(
        address from,
        address to,
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

        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(
                IHederaTokenService.associateToken.selector,
                address(this),
                tokenAddress
            )
        );

        int32 code = abi.decode(result, (int32));

        require(
            success &&
                (code == HederaResponseCodes.SUCCESS ||
                    code ==
                    HederaResponseCodes.TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT),
            "Token associate failed"
        );

        balances[tokenAddress] += amount;

        (bool success1, bytes memory result1) = precompileAddress.call(
            abi.encodeWithSelector(
                IHederaTokenService.transferFrom.selector,
                tokenAddress,
                msg.sender,
                address(this),
                amount
            )
        );

        int32 code1 = abi.decode(result1, (int32));

        require(success1, "Token deposit failed");

        require(
            code1 == HederaResponseCodes.SUCCESS,
            Strings.toStringSigned(code1)
        );

        emit TokenDeposited(tokenAddress, amount);
    }

    function transferHBARToUser(address to, uint256 amount) public onlyOwner {
        require(amount > 0 && amount <= balance, "Invalid transfer amount");

        balance -= amount;

        (bool success, ) = payable(to).call{value: amount}("");

        require(success, "HBAR transfer failed");

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
        require(amount > 0, "Invalid transfer amount");

        require(balances[tokenAddress] >= amount, "Insufficient balance");

        balances[tokenAddress] -= amount;

        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(
                IHederaTokenService.transferToken.selector,
                tokenAddress,
                address(this),
                to,
                amount
            )
        );

        int32 code = abi.decode(result, (int32));

        require(
            success && code == HederaResponseCodes.SUCCESS,
            "Token transfer failed"
        );

        emit TokenTransferred(address(this), to, tokenAddress, amount);
    }

    function transferTokenFromUser(
        address from,
        address tokenAddress,
        uint256 amount
    ) public onlyOwner {
        require(amount > 0, "Invalid transfer amount");

        balances[tokenAddress] += amount;

        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(
                IHederaTokenService.transferFrom.selector,
                tokenAddress,
                from,
                address(this),
                amount
            )
        );

        int32 code = abi.decode(result, (int32));

        require(
            success && code == HederaResponseCodes.SUCCESS,
            "Token transfer failed"
        );

        emit TokenTransferred(from, address(this), tokenAddress, amount);
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

        balance -= amount;

        (bool success, ) = payable(owner()).call{value: amount}("");

        require(success, "HBAR withdraw failed");

        emit HBARWithdrawn(amount);
    }

    // Only the owner can withdraw tokens from this contract
    function withdrawToken(
        address tokenAddress,
        uint256 amount
    ) external onlyOwner {
        require(amount > 0, "Invalid withdrawal amount");

        require(balances[tokenAddress] >= amount, "Insufficient balance");

        balances[tokenAddress] -= amount;

        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(
                IHederaTokenService.transferToken.selector,
                tokenAddress,
                address(this),
                msg.sender,
                amount
            )
        );

        int32 code = abi.decode(result, (int32));

        require(
            success && code == HederaResponseCodes.SUCCESS,
            "Token withdraw failed"
        );

        emit TokenWithdrawn(tokenAddress, amount);
    }
}
