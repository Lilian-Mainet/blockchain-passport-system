
import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

const contractName = "passort-system";

describe("Passport System Contract", () => {
  beforeEach(() => {
    // Reset the simnet state before each test
  });

  describe("Read-Only Functions", () => {
    it("should return none for non-existent passport", () => {
      const result = simnet.callReadOnlyFn(
        contractName,
        "get-passport",
        [Cl.stringUtf8("NON_EXISTENT")],
        wallet1
      );
      expect(result.result).toBeNone();
    });

    it("should return none for holder with no passport", () => {
      const result = simnet.callReadOnlyFn(
        contractName,
        "get-holder-passport",
        [Cl.principal(wallet1)],
        wallet1
      );
      expect(result.result).toBeNone();
    });

    it("should return false for invalid passport check", () => {
      const result = simnet.callReadOnlyFn(
        contractName,
        "is-valid-passport?",
        [Cl.stringUtf8("NON_EXISTENT")],
        wallet1
      );
      expect(result.result).toBeBool(false);
    });

    it("should return false for non-authority address", () => {
      const result = simnet.callReadOnlyFn(
        contractName,
        "is-authority",
        [Cl.principal(wallet1)],
        wallet1
      );
      expect(result.result).toBeBool(false);
    });
  });

  describe("Authority Management", () => {
    it("should allow contract owner to add authority", () => {
      const result = simnet.callPublicFn(
        contractName,
        "add-authority",
        [Cl.principal(wallet1), Cl.stringUtf8("Test Authority")],
        deployer
      );
      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should reject non-owner attempts to add authority", () => {
      const result = simnet.callPublicFn(
        contractName,
        "add-authority",
        [Cl.principal(wallet2), Cl.stringUtf8("Test Authority")],
        wallet1
      );
      expect(result.result).toBeErr(Cl.uint(1)); // err-unauthorized
    });

    it("should confirm authority status after adding", () => {
      // First add authority
      simnet.callPublicFn(
        contractName,
        "add-authority",
        [Cl.principal(wallet1), Cl.stringUtf8("Test Authority")],
        deployer
      );

      // Then check authority status
      const result = simnet.callReadOnlyFn(
        contractName,
        "is-authority",
        [Cl.principal(wallet1)],
        wallet1
      );
      expect(result.result).toBeBool(true);
    });

    it("should allow contract owner to remove authority", () => {
      // First add authority
      simnet.callPublicFn(
        contractName,
        "add-authority",
        [Cl.principal(wallet1), Cl.stringUtf8("Test Authority")],
        deployer
      );

      // Then remove authority
      const result = simnet.callPublicFn(
        contractName,
        "remove-authority",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should reject non-owner attempts to remove authority", () => {
      const result = simnet.callPublicFn(
        contractName,
        "remove-authority",
        [Cl.principal(wallet1)],
        wallet1
      );
      expect(result.result).toBeErr(Cl.uint(1)); // err-unauthorized
    });

    it("should confirm authority is inactive after removal", () => {
      // First add authority
      simnet.callPublicFn(
        contractName,
        "add-authority",
        [Cl.principal(wallet1), Cl.stringUtf8("Test Authority")],
        deployer
      );

      // Remove authority
      simnet.callPublicFn(
        contractName,
        "remove-authority",
        [Cl.principal(wallet1)],
        deployer
      );

      // Check authority status
      const result = simnet.callReadOnlyFn(
        contractName,
        "is-authority",
        [Cl.principal(wallet1)],
        wallet1
      );
      expect(result.result).toBeBool(false);
    });
  });
});
