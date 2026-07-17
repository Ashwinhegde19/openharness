# Security Policy

## Reporting a vulnerability

**Report security issues privately.** Do not open a public issue for anything
that could expose a vulnerability, leak credentials, or reveal a sensitive
configuration path.

Use GitHub's private vulnerability reporting:

- Open the **Security** tab of this repository
- Choose **Report a vulnerability**
- Or use the direct link:
  <https://github.com/Ashwinhegde19/openharness/security/advisories/new>

You will receive a private channel for follow-up. We aim to acknowledge
reports within a few business days.

## What counts as sensitive

- API keys / tokens for any provider (Together, OpenRouter, Exa, …)
- Local proxy endpoints or loopback auth tokens
- Credential persistence, session storage, or temp-file handling
- Anything that obscures where a user's prompts are sent

## Full threat model

The complete security design, threat model, severity scale, and incident
response procedure live in
[`docs/SECURITY.md`](docs/SECURITY.md). That document is normative; this file
is the short entry point for reporters.
