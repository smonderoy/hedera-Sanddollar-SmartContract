import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Vault", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployVaultFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const Vault = await ethers.getContractFactory("Vault");
    const vault = await Vault.deploy();

    // Deploy Mock tokens with 1000 initial supply.
    const TokenA = await ethers.getContractFactory("MockToken");
    const tokenA = await TokenA.deploy("Mock Token A", "MCKA", ethers.parseUnits("1000", "mwei"));

    const TokenB = await ethers.getContractFactory("MockToken");
    const tokenB = await TokenB.deploy("Mock Token B", "MCKB", ethers.parseUnits("1000", "mwei"));

    const TokenC = await ethers.getContractFactory("MockToken");
    const tokenC = await TokenC.deploy("Mock Token C", "MCKC", ethers.parseUnits("1000", "mwei"));

    // approve tokens to vault contract
    await tokenA.connect(owner).approve(vault.target, ethers.parseUnits("1000", "mwei"));
    await tokenB.connect(owner).approve(vault.target, ethers.parseUnits("1000", "mwei"));
    await tokenC.connect(owner).approve(vault.target, ethers.parseUnits("1000", "mwei"));

    return { vault, tokenA, tokenB, tokenC, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { vault, owner } = await loadFixture(deployVaultFixture);

      expect(await vault.owner()).to.equal(owner.address);

    });
  });

  describe("Deposit", function () {
    it("Deposit HBAR", async function () {
      const { vault } = await loadFixture(deployVaultFixture);

      await vault.depositHBAR({ value: ethers.parseEther("1") });

      expect(await vault.balance()).to.equal(ethers.parseEther("1"));
    });

    it("Deposit Tokens", async function () {
      const { vault, tokenA, tokenB, owner, otherAccount } = await loadFixture(
        deployVaultFixture
      );

      // We use vault.connect() to send a transaction from another account
      await expect(vault.connect(otherAccount).depositToken(tokenA.target, ethers.parseEther("10"))).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");

      // Deposit tokens
      await expect(vault.connect(owner).depositToken(tokenA.target, ethers.parseUnits("1000", "mwei"))).not.to.be.reverted;
      expect(await vault.balances(tokenA.target)).to.equal(ethers.parseUnits("1000", "mwei"));

      await expect(vault.connect(owner).depositToken(tokenB.target, ethers.parseUnits("1000", "mwei"))).not.to.be.reverted;
      expect(await vault.balances(tokenB.target)).to.equal(ethers.parseUnits("1000", "mwei"));
    });
  });

  describe("Transfer", function () {
    describe("Transfer HBAR", function () {
      it("Should revert with invalid amount", async function () {
        const { vault, owner, otherAccount } = await loadFixture(deployVaultFixture);

        await vault.depositHBAR({ value: ethers.parseEther("10") });

        // should send amount greater than 0
        await expect(vault.connect(owner).transferHBARToUser(otherAccount, ethers.parseEther("0"))).to.be.revertedWith("Invalid transfer amount");

        // should send amount smaller than balance
        await expect(vault.connect(owner).transferHBARToUser(otherAccount, ethers.parseEther("11"))).to.be.revertedWith("Invalid transfer amount");

        // should send amount greater than 0
        await expect(vault.connect(otherAccount).transferHBARFromUser()).to.be.revertedWith("Transfer amount smaller than 0");
      });

      it("Should transfer HBAR", async function () {
        const { vault, owner, otherAccount } = await loadFixture(deployVaultFixture);

        await vault.depositHBAR({ value: ethers.parseEther("10") });

        await expect(vault.connect(owner).transferHBARToUser(otherAccount, ethers.parseEther("1"))).not.to.be.reverted;

        expect(await vault.balance()).to.equal(ethers.parseEther("9"));

        expect(await ethers.provider.getBalance(otherAccount.address)).to.equal(ethers.parseEther("10001")); // 10000(default) + 1

        await expect(vault.connect(otherAccount).transferHBARFromUser({ value: ethers.parseEther("2") })).not.to.be.reverted;

        expect(await vault.balance()).to.equal(ethers.parseEther("11"));
      });
    });

    describe("Transfer Token", function () {
      it("Should revert with error if called from another account", async function () {
        const { vault, owner, otherAccount, tokenA } = await loadFixture(deployVaultFixture);

        await vault.connect(owner).depositToken(tokenA.target, ethers.parseUnits("1000", "mwei"));

        await expect(vault.connect(otherAccount).transferTokenToUser(otherAccount.address, tokenA.target, ethers.parseUnits("10", "mwei"))).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
      });

      it("Should revert with invalid amount", async function () {
        const { vault, owner, otherAccount, tokenA } = await loadFixture(deployVaultFixture);

        await vault.connect(owner).depositToken(tokenA.target, ethers.parseUnits("1000", "mwei"));

        // should send amount smaller than balance
        await expect(vault.connect(owner).transferTokenToUser(otherAccount.address, tokenA.target, ethers.parseUnits("1001", "mwei"))).to.be.revertedWith("Insufficient balance");
      });

      it("Should transfer token", async function () {
        const { vault, owner, otherAccount, tokenA, tokenB, tokenC } = await loadFixture(deployVaultFixture);

        await vault.connect(owner).depositToken(tokenA.target, ethers.parseUnits("1000", "mwei"));
        await vault.connect(owner).depositToken(tokenB.target, ethers.parseUnits("1000", "mwei"));
        await vault.connect(owner).depositToken(tokenC.target, ethers.parseUnits("1000", "mwei"));

        await expect(vault.connect(owner).transferTokenToUser(otherAccount.address, tokenA.target, ethers.parseUnits("100", "mwei"))).not.to.be.reverted;

        expect(await vault.balances(tokenA.target)).to.equal(ethers.parseUnits("900", "mwei"));

        await expect(tokenA.connect(otherAccount).approve(vault.target, ethers.parseUnits("50", "mwei"))).not.to.be.reverted;

        await expect(vault.connect(owner).transferTokenFromUser(otherAccount.address, tokenA.target, ethers.parseUnits("50", "mwei"))).not.to.be.reverted;

        expect(await vault.balances(tokenA.target)).to.equal(ethers.parseUnits("950", "mwei"));
      });
    });
  });

  describe("Withdraw", function () {
    describe("Withdraw HBAR", function () {
      it("Should revert with error if called from another account", async function () {
        const { vault, otherAccount } = await loadFixture(deployVaultFixture);

        await vault.depositHBAR({ value: ethers.parseEther("10") });

        await expect(vault.connect(otherAccount).withdrawHBAR(ethers.parseEther("1"))).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
      });

      it("Should revert with invalid amount", async function () {
        const { vault, owner } = await loadFixture(deployVaultFixture);

        await vault.depositHBAR({ value: ethers.parseEther("10") });

        // should send amount greater than 0
        await expect(vault.connect(owner).withdrawHBAR(ethers.parseEther("0"))).to.be.revertedWith("Invalid withdrawal amount");

        // should send amount smaller than balance
        await expect(vault.connect(owner).withdrawHBAR(ethers.parseEther("11"))).to.be.revertedWith("Invalid withdrawal amount");
      });

      it("Should withdraw HBAR", async function () {
        const { vault, owner } = await loadFixture(deployVaultFixture);

        await vault.depositHBAR({ value: ethers.parseEther("10") });

        await expect(vault.connect(owner).withdrawHBAR(ethers.parseEther("1"))).to.changeEtherBalances(
          [owner, vault],
          [ethers.parseEther("1"), ethers.parseEther("-1")]
        );
      });
    });

    describe("Withdraw Token", function () {
      it("Should revert with error if called from another account", async function () {
        const { vault, owner, otherAccount, tokenA } = await loadFixture(deployVaultFixture);

        await vault.connect(owner).depositToken(tokenA.target, ethers.parseUnits("1000", "mwei"));

        await expect(vault.connect(otherAccount).withdrawToken(tokenA.target, ethers.parseUnits("10", "mwei"))).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
      });

      it("Should revert with invalid amount", async function () {
        const { vault, owner, tokenA } = await loadFixture(deployVaultFixture);

        await vault.connect(owner).depositToken(tokenA.target, ethers.parseUnits("1000", "mwei"));

        // should send amount greater than 0
        await expect(vault.connect(owner).withdrawToken(tokenA.target, ethers.parseUnits("0", "mwei"))).to.be.revertedWith("Withdraw amount smaller than 0");

        // should withdraw amount smaller than balance
        await expect(vault.connect(owner).withdrawToken(tokenA.target, ethers.parseUnits("1001", "mwei"))).to.be.revertedWith("Insufficient balance");
      });

      it("Should withdraw token", async function () {
        const { vault, owner, tokenA } = await loadFixture(deployVaultFixture);

        await vault.connect(owner).depositToken(tokenA.target, ethers.parseUnits("1000", "mwei"));

        await expect(vault.connect(owner).withdrawToken(tokenA.target, ethers.parseUnits("100", "mwei"))).not.to.be.reverted;

        expect(await vault.balances(tokenA.target)).to.equal(ethers.parseUnits("900", "mwei"));
      });
    });
  });
});
