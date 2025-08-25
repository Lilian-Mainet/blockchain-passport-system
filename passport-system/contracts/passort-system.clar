;; Digital Passport System Contract

;; === Constants ===
(define-constant contract-owner tx-sender)

(define-constant err-unauthorized (err u1))
(define-constant err-invalid-input (err u2))
(define-constant err-already-exists (err u3))
(define-constant err-not-found (err u4))
(define-constant err-invalid (err u5))
(define-constant err-operation-failed (err u6))

;; === Data Maps ===

;; Stores passport info keyed by passport ID
(define-map Passports
    { passport-id: (string-utf8 20) }
    {
        holder: principal,
        issue-date: uint,
        expiry-date: uint,
        metadata: (string-utf8 500),
        issuer: principal,
        status: (string-utf8 20),
    }
)

;; Stores whether an address is a valid passport authority
(define-map PassportAuthorities
    { authority: principal }
    {
        active: bool,
        name: (string-utf8 100),
    }
)

;; Maps holder address to their passport ID
(define-map HolderPassports
    { holder: principal }
    { passport-id: (string-utf8 20) }
)

;; Maps passport number to a boolean for uniqueness enforcement
(define-map PassportNumbers
    { passport-id: (string-utf8 20) }
    { exists: bool }
)

;; === Read-Only Functions ===

(define-read-only (get-passport (passport-id (string-utf8 20)))
    (map-get? Passports { passport-id: passport-id })
)

(define-read-only (get-holder-passport (holder principal))
    (map-get? HolderPassports { holder: holder })
)

(define-read-only (is-valid-passport? (passport-id (string-utf8 20)))
    (match (map-get? Passports { passport-id: passport-id })
        passport (if (is-eq (get status passport) u"active")
            true
            false
        )
        false
    )
)

(define-read-only (is-authority (addr principal))
    (match (map-get? PassportAuthorities { authority: addr })
        auth (get active auth)
        false
    )
)
;; === Authority Management ===

(define-public (add-authority
        (authority principal)
        (authority-name (string-utf8 100))
    )
    (begin
        (if (is-eq tx-sender contract-owner)
            (begin
                (map-set PassportAuthorities { authority: authority } {
                    active: true,
                    name: authority-name,
                })
                (ok true)
            )
            err-unauthorized
        )
    )
)

(define-public (remove-authority (authority principal))
    (begin
        (if (is-eq tx-sender contract-owner)
            (begin
                (map-set PassportAuthorities { authority: authority } {
                    active: false,
                    name: u"Revoked",
                })
                (ok true)
            )
            err-unauthorized
        )
    )
)

(define-public (issue-passport (params {
    passport-id: (string-utf8 20),
    holder: principal,
    metadata: (string-utf8 500),
    expiry-date: uint,
}))
    (let (
            (passport-id (get passport-id params))
            (holder (get holder params))
            (metadata (get metadata params))
            (expiry-date (get expiry-date params))
        )
        (begin
            (if (not (is-authority tx-sender))
                err-unauthorized
                (if (is-some (map-get? PassportNumbers { passport-id: passport-id }))
                    err-already-exists
                    (if (is-some (map-get? HolderPassports { holder: holder }))
                        err-already-exists
                        (begin
                            (map-set Passports { passport-id: passport-id } {
                                holder: holder,
                                issue-date: stacks-block-height,
                                expiry-date: expiry-date,
                                metadata: metadata,
                                issuer: tx-sender,
                                status: u"active",
                            })
                            (map-set HolderPassports { holder: holder } { passport-id: passport-id })
                            (map-set PassportNumbers { passport-id: passport-id } { exists: true })
                            (ok passport-id)
                        )
                    )
                )
            )
        )
    )
)

(define-public (revoke-passport (passport-id (string-utf8 20)))
    (begin
        (match (map-get? Passports { passport-id: passport-id })
            passport (if (not (is-eq (get issuer passport) tx-sender))
                err-unauthorized
                (begin
                    (map-set Passports { passport-id: passport-id }
                        (merge passport { status: u"revoked" })
                    )
                    (ok true)
                )
            )
            err-not-found
        )
    )
)

(define-public (update-passport-metadata
        (passport-id (string-utf8 20))
        (new-meta (string-utf8 500))
    )
    (begin
        (match (map-get? Passports { passport-id: passport-id })
            passport (if (not (is-eq (get issuer passport) tx-sender))
                err-unauthorized
                (begin
                    (map-set Passports { passport-id: passport-id }
                        (merge passport { metadata: new-meta })
                    )
                    (ok true)
                )
            )
            err-not-found
        )
    )
)

(define-public (extend-passport-validity
        (passport-id (string-utf8 20))
        (new-expiry uint)
    )
    (begin
        (match (map-get? Passports { passport-id: passport-id })
            passport (if (not (is-eq (get issuer passport) tx-sender))
                err-unauthorized
                (begin
                    (map-set Passports { passport-id: passport-id }
                        (merge passport { expiry-date: new-expiry })
                    )
                    (ok true)
                )
            )
            err-not-found
        )
    )
)
