import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const VaultModule = buildModule("VaultModule", (m) => {
    const vault = m.contract("Vault");

    m.call(vault, "owner", []);

    return { vault };
});

export default VaultModule;
