import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const HTSModule = buildModule("HTSModule", (m) => {
    const hts = m.contract("HederaTokenService");

    console.log(hts);

    return { hts };
});

export default HTSModule;
