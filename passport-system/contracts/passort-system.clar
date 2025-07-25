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
