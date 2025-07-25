# Blockchain-Based Digital Passport System

A secure and decentralized digital passport management system implemented using Clarity smart contracts on the Stacks blockchain. This system enables authorized authorities to issue, manage, and verify digital passports while maintaining security and preventing fraud.

## Overview

The Digital Passport System provides a blockchain-based solution for:

- Issuing and managing digital passports
- Verifying passport authenticity
- Managing passport authorities
- Tracking passport validity
- Storing and updating passport metadata

## Features

- **Secure Passport Issuance**: Only authorized authorities can issue new passports
- **Fraud Prevention**: Built-in checks prevent duplicate passport numbers and multiple passports per holder
- **Validity Management**: Passports have built-in expiration dates and can be extended or revoked
- **Authority Management**: Designated contract owner can add or remove passport-issuing authorities
- **Metadata Support**: Optional metadata URL for additional passport-related information
- **Read-Only Functions**: Public functions to verify passport validity and holder information

## Smart Contract Functions

### Administrative Functions

```clarity
(define-public (add-authority (authority-address principal) (authority-name (string-utf8 100))))
(define-public (remove-authority (authority-address principal)))
```

### Passport Management Functions

```clarity
(define-public (issue-passport
    (passport-id (string-utf8 32))
    (holder principal)
    (full-name (string-utf8 100))
    (date-of-birth uint)
    (nationality (string-utf8 50))
    (validity-period uint)
    (metadata-url (optional (string-utf8 256)))
))

(define-public (revoke-passport (passport-id (string-utf8 32))))
(define-public (extend-passport-validity (passport-id (string-utf8 32)) (extension-period uint)))
(define-public (update-passport-metadata (passport-id (string-utf8 32)) (metadata-url (optional (string-utf8 256)))))
```

### Read-Only Functions

```clarity
(define-read-only (get-passport (passport-id (string-utf8 32))))
(define-read-only (get-holder-passport (holder principal)))
(define-read-only (is-valid-passport? (passport-id (string-utf8 32))))
(define-read-only (is-authority (address principal)))
```

## Error Codes

| Code | Description                                             |
| ---- | ------------------------------------------------------- |
| u1   | Unauthorized - Caller doesn't have required permissions |
| u2   | Invalid input - Input parameters are invalid            |
| u3   | Already exists - Passport/Authority already registered  |
| u4   | Not found - Requested entity doesn't exist              |
| u5   | Expired or invalid - Passport is no longer valid        |
| u6   | Operation failed - Generic operation failure            |

## Data Structures

### Passport Data

```clarity
{
    holder: principal,
    full-name: (string-utf8 100),
    date-of-birth: uint,
    nationality: (string-utf8 50),
    issue-date: uint,
    expiry-date: uint,
    is-valid: bool,
    metadata-url: (optional (string-utf8 256))
}
```

### Authority Data

```clarity
{
    name: (string-utf8 100),
    active: bool,
    authorized-since: uint
}
```

## Security Features

1. **Access Control**

   - Only the contract owner can manage authorities
   - Only authorized authorities can issue and manage passports
   - Public read-only functions for transparency

2. **Data Integrity**

   - Prevention of duplicate passport numbers
   - One passport per holder enforcement
   - Immutable passport history on blockchain

3. **Validity Management**
   - Built-in expiration dates
   - Authority-controlled validity extensions
   - Revocation capability for compromised passports

## Usage Examples

### Adding a New Authority

```clarity
(contract-call? .passport-system add-authority 'SPNWZ5V2TPWGQGVDR6T7B6RQ4XMGZ4PXTEE0VQ0C "US Passport Office")
```

### Issuing a New Passport

```clarity
(contract-call? .passport-system issue-passport
    "US123456789"
    'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7
    "John Doe"
    u19900101
    "United States"
    u31536000
    (some "https://example.com/passport/metadata/123")
)
```

### Verifying a Passport

```clarity
(contract-call? .passport-system is-valid-passport? "US123456789")
```

## Implementation Considerations

1. **Block Height Usage**

   - Block height is used for timing operations
   - Issue dates and expiration dates are based on block height
   - Consider block time when setting validity periods

2. **String Length Limits**

   - Passport ID: 32 characters
   - Full Name: 100 characters
   - Nationality: 50 characters
   - Metadata URL: 256 characters

3. **Metadata Handling**
   - Metadata URLs are optional
   - External storage recommended for additional data
   - IPFS or similar decentralized storage recommended for metadata

## Best Practices

1. **Authority Management**

   - Regularly audit active authorities
   - Implement multi-sig for authority management
   - Maintain an off-chain registry of authorized entities

2. **Passport Issuance**

   - Verify holder identity off-chain before issuance
   - Use standardized formats for passport IDs
   - Include checksum in passport ID format

3. **Security**
   - Regular security audits
   - Monitor for unusual patterns
   - Implement emergency pause functionality (future enhancement)

## Future Enhancements

1. Multi-signature authority management
2. Passport transfer functionality
3. Enhanced metadata management
4. Authority hierarchy system
5. Automated validity checks
6. Integration with physical passport systems
7. Cross-border verification protocol

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License

Copyright (c) 2024 [Ilesanmi oluwatosin]
