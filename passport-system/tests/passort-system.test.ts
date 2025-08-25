
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

  describe("Passport Issuance and Validation", () => {
    beforeEach(() => {
      // Add wallet1 as an authority for passport issuance tests
      simnet.callPublicFn(
        contractName,
        "add-authority",
        [Cl.principal(wallet1), Cl.stringUtf8("Test Authority")],
        deployer
      );
    });

    it("should allow authority to issue a passport", () => {
      const passportParams = Cl.tuple({
        "passport-id": Cl.stringUtf8("PASS001"),
        "holder": Cl.principal(wallet2),
        "metadata": Cl.stringUtf8("Test passport metadata"),
        "expiry-date": Cl.uint(1000)
      });

      const result = simnet.callPublicFn(
        contractName,
        "issue-passport",
        [passportParams],
        wallet1 // wallet1 is an authority
      );

      expect(result.result).toBeOk(Cl.stringUtf8("PASS001"));
    });

    it("should reject passport issuance by non-authority", () => {
      const passportParams = Cl.tuple({
        "passport-id": Cl.stringUtf8("PASS002"),
        "holder": Cl.principal(wallet2),
        "metadata": Cl.stringUtf8("Test passport metadata"),
        "expiry-date": Cl.uint(1000)
      });

      const result = simnet.callPublicFn(
        contractName,
        "issue-passport",
        [passportParams],
        wallet2 // wallet2 is not an authority
      );

      expect(result.result).toBeErr(Cl.uint(1)); // err-unauthorized
    });

    it("should prevent duplicate passport IDs", () => {
      const passportParams1 = Cl.tuple({
        "passport-id": Cl.stringUtf8("PASS003"),
        "holder": Cl.principal(wallet2),
        "metadata": Cl.stringUtf8("First passport"),
        "expiry-date": Cl.uint(1000)
      });

      const passportParams2 = Cl.tuple({
        "passport-id": Cl.stringUtf8("PASS003"), // Same ID
        "holder": Cl.principal(deployer),
        "metadata": Cl.stringUtf8("Second passport"),
        "expiry-date": Cl.uint(2000)
      });

      // First issuance should succeed
      const result1 = simnet.callPublicFn(
        contractName,
        "issue-passport",
        [passportParams1],
        wallet1
      );
      expect(result1.result).toBeOk(Cl.stringUtf8("PASS003"));

      // Second issuance with same ID should fail
      const result2 = simnet.callPublicFn(
        contractName,
        "issue-passport",
        [passportParams2],
        wallet1
      );
      expect(result2.result).toBeErr(Cl.uint(3)); // err-already-exists
    });

    it("should prevent multiple passports for same holder", () => {
      const passportParams1 = Cl.tuple({
        "passport-id": Cl.stringUtf8("PASS004"),
        "holder": Cl.principal(wallet2),
        "metadata": Cl.stringUtf8("First passport"),
        "expiry-date": Cl.uint(1000)
      });

      const passportParams2 = Cl.tuple({
        "passport-id": Cl.stringUtf8("PASS005"),
        "holder": Cl.principal(wallet2), // Same holder
        "metadata": Cl.stringUtf8("Second passport"),
        "expiry-date": Cl.uint(2000)
      });

      // First issuance should succeed
      const result1 = simnet.callPublicFn(
        contractName,
        "issue-passport",
        [passportParams1],
        wallet1
      );
      expect(result1.result).toBeOk(Cl.stringUtf8("PASS004"));

      // Second issuance for same holder should fail
      const result2 = simnet.callPublicFn(
        contractName,
        "issue-passport",
        [passportParams2],
        wallet1
      );
      expect(result2.result).toBeErr(Cl.uint(3)); // err-already-exists
    });

    it("should retrieve issued passport details", () => {
      const passportParams = Cl.tuple({
        "passport-id": Cl.stringUtf8("PASS006"),
        "holder": Cl.principal(wallet2),
        "metadata": Cl.stringUtf8("Detailed passport info"),
        "expiry-date": Cl.uint(1500)
      });

      // Issue passport
      simnet.callPublicFn(
        contractName,
        "issue-passport",
        [passportParams],
        wallet1
      );

      // Retrieve passport
      const result = simnet.callReadOnlyFn(
        contractName,
        "get-passport",
        [Cl.stringUtf8("PASS006")],
        wallet1
      );

      expect(result.result).toBeSome(
        Cl.tuple({
          "holder": Cl.principal(wallet2),
          "issue-date": Cl.uint(simnet.blockHeight), // Current block height
          "expiry-date": Cl.uint(1500),
          "metadata": Cl.stringUtf8("Detailed passport info"),
          "issuer": Cl.principal(wallet1),
          "status": Cl.stringUtf8("active")
        })
      );
    });

    it("should retrieve passport by holder", () => {
      const passportParams = Cl.tuple({
        "passport-id": Cl.stringUtf8("PASS007"),
        "holder": Cl.principal(wallet2),
        "metadata": Cl.stringUtf8("Holder lookup test"),
        "expiry-date": Cl.uint(1200)
      });

      // Issue passport
      simnet.callPublicFn(
        contractName,
        "issue-passport",
        [passportParams],
        wallet1
      );

      // Retrieve by holder
      const result = simnet.callReadOnlyFn(
        contractName,
        "get-holder-passport",
        [Cl.principal(wallet2)],
        wallet1
      );

      expect(result.result).toBeSome(
        Cl.tuple({
          "passport-id": Cl.stringUtf8("PASS007")
        })
      );
    });

    it("should validate active passport correctly", () => {
      const passportParams = Cl.tuple({
        "passport-id": Cl.stringUtf8("PASS008"),
        "holder": Cl.principal(wallet2),
        "metadata": Cl.stringUtf8("Validation test"),
        "expiry-date": Cl.uint(1800)
      });

      // Issue passport
      simnet.callPublicFn(
        contractName,
        "issue-passport",
        [passportParams],
        wallet1
      );

      // Check if passport is valid
      const result = simnet.callReadOnlyFn(
        contractName,
        "is-valid-passport?",
        [Cl.stringUtf8("PASS008")],
        wallet1
      );

      expect(result.result).toBeBool(true);
    });
  });
});

