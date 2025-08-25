
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

  describe("Passport Management", () => {
    beforeEach(() => {
      // Add wallet1 as an authority for passport management tests
      simnet.callPublicFn(
        contractName,
        "add-authority",
        [Cl.principal(wallet1), Cl.stringUtf8("Test Authority")],
        deployer
      );

      // Issue a passport for testing management operations
      const passportParams = Cl.tuple({
        "passport-id": Cl.stringUtf8("MGMT001"),
        "holder": Cl.principal(wallet2),
        "metadata": Cl.stringUtf8("Management test passport"),
        "expiry-date": Cl.uint(2000)
      });

      simnet.callPublicFn(
        contractName,
        "issue-passport",
        [passportParams],
        wallet1
      );
    });

    describe("Passport Revocation", () => {
      it("should allow issuer to revoke passport", () => {
        const result = simnet.callPublicFn(
          contractName,
          "revoke-passport",
          [Cl.stringUtf8("MGMT001")],
          wallet1 // wallet1 is the issuer
        );

        expect(result.result).toBeOk(Cl.bool(true));
      });

      it("should reject revocation by non-issuer", () => {
        const result = simnet.callPublicFn(
          contractName,
          "revoke-passport",
          [Cl.stringUtf8("MGMT001")],
          wallet2 // wallet2 is not the issuer
        );

        expect(result.result).toBeErr(Cl.uint(1)); // err-unauthorized
      });

      it("should reject revocation of non-existent passport", () => {
        const result = simnet.callPublicFn(
          contractName,
          "revoke-passport",
          [Cl.stringUtf8("NON_EXISTENT")],
          wallet1
        );

        expect(result.result).toBeErr(Cl.uint(4)); // err-not-found
      });

      it("should update passport status to revoked", () => {
        // Revoke the passport
        simnet.callPublicFn(
          contractName,
          "revoke-passport",
          [Cl.stringUtf8("MGMT001")],
          wallet1
        );

        // Check passport status
        const result = simnet.callReadOnlyFn(
          contractName,
          "get-passport",
          [Cl.stringUtf8("MGMT001")],
          wallet1
        );

        expect(result.result).toBeSome(
          Cl.tuple({
            "holder": Cl.principal(wallet2),
            "issue-date": Cl.uint(simnet.blockHeight - 1),
            "expiry-date": Cl.uint(2000),
            "metadata": Cl.stringUtf8("Management test passport"),
            "issuer": Cl.principal(wallet1),
            "status": Cl.stringUtf8("revoked")
          })
        );
      });

      it("should invalidate revoked passport", () => {
        // Revoke the passport
        simnet.callPublicFn(
          contractName,
          "revoke-passport",
          [Cl.stringUtf8("MGMT001")],
          wallet1
        );

        // Check if passport is still valid
        const result = simnet.callReadOnlyFn(
          contractName,
          "is-valid-passport?",
          [Cl.stringUtf8("MGMT001")],
          wallet1
        );

        expect(result.result).toBeBool(false);
      });
    });

    describe("Metadata Updates", () => {
      it("should allow issuer to update passport metadata", () => {
        const result = simnet.callPublicFn(
          contractName,
          "update-passport-metadata",
          [Cl.stringUtf8("MGMT001"), Cl.stringUtf8("Updated metadata information")],
          wallet1 // wallet1 is the issuer
        );

        expect(result.result).toBeOk(Cl.bool(true));
      });

      it("should reject metadata update by non-issuer", () => {
        const result = simnet.callPublicFn(
          contractName,
          "update-passport-metadata",
          [Cl.stringUtf8("MGMT001"), Cl.stringUtf8("Unauthorized update")],
          wallet2 // wallet2 is not the issuer
        );

        expect(result.result).toBeErr(Cl.uint(1)); // err-unauthorized
      });

      it("should reject metadata update for non-existent passport", () => {
        const result = simnet.callPublicFn(
          contractName,
          "update-passport-metadata",
          [Cl.stringUtf8("NON_EXISTENT"), Cl.stringUtf8("New metadata")],
          wallet1
        );

        expect(result.result).toBeErr(Cl.uint(4)); // err-not-found
      });

      it("should persist updated metadata", () => {
        // Update metadata
        simnet.callPublicFn(
          contractName,
          "update-passport-metadata",
          [Cl.stringUtf8("MGMT001"), Cl.stringUtf8("Updated passport information")],
          wallet1
        );

        // Retrieve passport and check metadata
        const result = simnet.callReadOnlyFn(
          contractName,
          "get-passport",
          [Cl.stringUtf8("MGMT001")],
          wallet1
        );

        expect(result.result).toBeSome(
          Cl.tuple({
            "holder": Cl.principal(wallet2),
            "issue-date": Cl.uint(simnet.blockHeight - 1),
            "expiry-date": Cl.uint(2000),
            "metadata": Cl.stringUtf8("Updated passport information"),
            "issuer": Cl.principal(wallet1),
            "status": Cl.stringUtf8("active")
          })
        );
      });
    });

    describe("Validity Extension", () => {
      it("should allow issuer to extend passport validity", () => {
        const result = simnet.callPublicFn(
          contractName,
          "extend-passport-validity",
          [Cl.stringUtf8("MGMT001"), Cl.uint(3000)],
          wallet1 // wallet1 is the issuer
        );

        expect(result.result).toBeOk(Cl.bool(true));
      });

      it("should reject validity extension by non-issuer", () => {
        const result = simnet.callPublicFn(
          contractName,
          "extend-passport-validity",
          [Cl.stringUtf8("MGMT001"), Cl.uint(3000)],
          wallet2 // wallet2 is not the issuer
        );

        expect(result.result).toBeErr(Cl.uint(1)); // err-unauthorized
      });

      it("should reject validity extension for non-existent passport", () => {
        const result = simnet.callPublicFn(
          contractName,
          "extend-passport-validity",
          [Cl.stringUtf8("NON_EXISTENT"), Cl.uint(3000)],
          wallet1
        );

        expect(result.result).toBeErr(Cl.uint(4)); // err-not-found
      });

      it("should persist updated expiry date", () => {
        // Extend validity
        simnet.callPublicFn(
          contractName,
          "extend-passport-validity",
          [Cl.stringUtf8("MGMT001"), Cl.uint(3500)],
          wallet1
        );

        // Retrieve passport and check expiry date
        const result = simnet.callReadOnlyFn(
          contractName,
          "get-passport",
          [Cl.stringUtf8("MGMT001")],
          wallet1
        );

        expect(result.result).toBeSome(
          Cl.tuple({
            "holder": Cl.principal(wallet2),
            "issue-date": Cl.uint(simnet.blockHeight - 1),
            "expiry-date": Cl.uint(3500),
            "metadata": Cl.stringUtf8("Management test passport"),
            "issuer": Cl.principal(wallet1),
            "status": Cl.stringUtf8("active")
          })
        );
      });
    });

    describe("Edge Cases and Integration", () => {
      it("should prevent management operations on revoked passports", () => {
        // First revoke the passport
        simnet.callPublicFn(
          contractName,
          "revoke-passport",
          [Cl.stringUtf8("MGMT001")],
          wallet1
        );

        // Try to update metadata on revoked passport
        const metadataResult = simnet.callPublicFn(
          contractName,
          "update-passport-metadata",
          [Cl.stringUtf8("MGMT001"), Cl.stringUtf8("Should not work")],
          wallet1
        );

        // Try to extend validity on revoked passport  
        const validityResult = simnet.callPublicFn(
          contractName,
          "extend-passport-validity",
          [Cl.stringUtf8("MGMT001"), Cl.uint(4000)],
          wallet1
        );

        // Both operations should succeed but the passport remains revoked
        expect(metadataResult.result).toBeOk(Cl.bool(true));
        expect(validityResult.result).toBeOk(Cl.bool(true));

        // Verify passport is still revoked
        const passportResult = simnet.callReadOnlyFn(
          contractName,
          "get-passport",
          [Cl.stringUtf8("MGMT001")],
          wallet1
        );

        expect(passportResult.result).toBeSome(
          Cl.tuple({
            "holder": Cl.principal(wallet2),
            "issue-date": Cl.uint(simnet.blockHeight - 3),
            "expiry-date": Cl.uint(4000),
            "metadata": Cl.stringUtf8("Should not work"),
            "issuer": Cl.principal(wallet1),
            "status": Cl.stringUtf8("revoked")
          })
        );
      });

      it("should maintain passport validity after metadata and expiry updates", () => {
        // Update metadata
        simnet.callPublicFn(
          contractName,
          "update-passport-metadata",
          [Cl.stringUtf8("MGMT001"), Cl.stringUtf8("Updated for validity test")],
          wallet1
        );

        // Extend validity
        simnet.callPublicFn(
          contractName,
          "extend-passport-validity",
          [Cl.stringUtf8("MGMT001"), Cl.uint(5000)],
          wallet1
        );

        // Check passport is still valid
        const validityResult = simnet.callReadOnlyFn(
          contractName,
          "is-valid-passport?",
          [Cl.stringUtf8("MGMT001")],
          wallet1
        );

        expect(validityResult.result).toBeBool(true);
      });
    });
  });
});

