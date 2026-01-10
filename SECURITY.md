# Security Policy

## Supported Versions

We take security seriously. The following versions of GrantFlow are currently supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in GrantFlow, please report it responsibly to **security@vsphera.com** instead of using the public issue tracker. This allows us to address the vulnerability before it becomes public knowledge.

### Information to Include in Your Report

To help us understand and address the vulnerability quickly, please include:

1. **Description**: Clear explanation of the security issue
2. **Type**: Classification (e.g., SQL injection, XSS, authentication bypass, data exposure, etc.)
3. **Location**: Affected component(s) or file(s)
4. **Steps to Reproduce**: Detailed instructions to confirm the vulnerability
5. **Impact Assessment**: Potential impact on security (e.g., data exposure, privilege escalation, denial of service)
6. **Proof of Concept**: If applicable, minimal code or steps demonstrating the vulnerability
7. **Your Contact Information**: Email address and optional PGP public key for secure communication

## Vulnerability Response Timeline

We are committed to responding to security vulnerabilities promptly:

- **Initial Response**: Within 24 hours of report submission
- **Status Updates**: Every 3-5 business days
- **Target Fix**: Within 7-14 days for critical vulnerabilities
- **Disclosure**: Coordinated disclosure with your input on timing

## Security Best Practices for Users

### API Keys and Credentials

- **Store Securely**: Never commit API keys, tokens, or credentials to version control
- **Rotate Regularly**: Implement a key rotation schedule
- **Least Privilege**: Use API keys with minimal required permissions
- **Monitor Usage**: Regularly review and audit API key usage

### Environment Variables

- Use a `.env` file for local development (add to `.gitignore`)
- Never include `.env` files in the repository
- Use environment variable management tools for production environments
- Rotate secrets regularly
- Audit environment variable access

### Dependency Management

- Keep dependencies up to date with latest security patches
- Run regular dependency audits:
  - Python: `pip audit`
  - Node.js: `npm audit` or `pnpm audit`
- Review security advisories for critical dependencies
- Subscribe to security advisories for projects you depend on
- Use lock files to ensure consistent, audited versions

### General Security Practices

- Enable two-factor authentication (2FA) on all accounts
- Use strong, unique passwords
- Keep your operating system and development tools updated
- Review code changes before merging to main/development branches
- Use HTTPS for all communications with GrantFlow services
- Report suspicious activity immediately

## Security Architecture

For detailed information about GrantFlow's security architecture, threat modeling, and implementation details, see [/docs/security-architecture.md](/docs/security-architecture.md).

## Disclosure Policy

When we fix a reported vulnerability:

1. We will create a private security advisory
2. We will coordinate with the reporter on disclosure timing (typically 30-90 days)
3. We will publish a public security advisory with the fix
4. We will credit the reporter in the advisory (unless they request anonymity)

## Scope

Our security policy covers:
- Core GrantFlow application
- Official packages and libraries (in `/packages/`)
- Backend services (in `/services/`)
- Infrastructure as Code (in `/terraform/`)

Third-party dependencies are subject to their own security policies. Please report third-party vulnerabilities to the respective project maintainers.

---

Thank you for helping us keep GrantFlow secure.
