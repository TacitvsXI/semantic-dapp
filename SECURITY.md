# Security Policy

## Scope and threat model

Semantic Dapp generates interfaces for **arbitrary, untrusted** smart contracts.
Contract metadata (names, NatSpec, symbols) is attacker-controlled and must be
treated as untrusted input. Key protections we care about:

- No arbitrary generated code execution - the generated UI is built only from
  trusted, reviewed components.
- Contract metadata and NatSpec must be sanitized before rendering.
- The tool never stores private keys and never signs transactions itself; all
  signing happens in the user's own wallet.
- Before any write, the user is shown the target, function signature, decoded
  calldata and value, and (where possible) a simulation result.

## Supported versions

During `v0.x`, only the latest published version receives security fixes.

## Reporting a vulnerability

Please **do not** open a public issue for security vulnerabilities.

Instead, use GitHub's private
["Report a vulnerability"](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
flow on this repository, or contact the maintainers privately.

We aim to acknowledge reports within a few business days and will keep you
updated on remediation progress.
