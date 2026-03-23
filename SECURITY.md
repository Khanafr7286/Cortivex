# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |

## Built-in Security

Cortivex includes security hardening across all components:

**Input Validation**
- Pipeline names enforced to alphanumeric characters, hyphens, and underscores (max 64 characters)
- Agent IDs sanitized before use in filesystem operations (max 128 characters)
- All MCP tool arguments validated with type checking and enum enforcement
- Request body size limited to 1MB to prevent payload-based DoS

**Path Traversal Prevention**
- All file path operations use `resolve()` verification against base directories
- Pipeline loader validates that resolved paths stay within the designated pipelines directory
- Mesh manager sanitizes agent IDs before constructing file paths

**YAML Injection Protection**
- YAML parsing uses `maxAliasCount: 100` to prevent billion-laughs expansion attacks
- Pipeline parser enforces a 1MB input size limit before parsing
- No custom YAML tags are enabled

**HTTP Security Headers**
- `X-Content-Type-Options: nosniff` prevents MIME type sniffing
- `X-Frame-Options: DENY` prevents clickjacking
- `X-XSS-Protection: 1; mode=block` enables browser XSS filtering

**CORS Configuration**
- Origins restricted to localhost by default
- Configurable via `CORTIVEX_ALLOWED_ORIGINS` environment variable
- Does not allow all origins in production

**Query Parameter Bounds**
- Numeric parameters (limit, offset) clamped to safe ranges (1-1000)
- Invalid numeric inputs fall back to safe defaults

## Reporting a Vulnerability

Do not open a public GitHub issue for security vulnerabilities. Instead, open a private security advisory through the GitHub Security tab on this repository. Include:

- A clear description of the vulnerability
- Steps to reproduce the issue
- Affected versions and components
- Impact assessment (severity, potential for exploitation)
- Any suggested fixes or mitigations, if available

## Response Timeline

- **48 hours**: Initial acknowledgment of your report
- **7 days**: Preliminary assessment and severity classification
- **30 days**: Target for a fix or mitigation to be released

## Safe Harbor

We consider security research conducted in good faith to be authorized activity. We will not pursue legal action against researchers who:

- Make a good faith effort to avoid privacy violations, data destruction, and service disruption
- Report vulnerabilities promptly and provide sufficient detail for reproduction
- Do not publicly disclose the vulnerability before a fix is available
- Do not exploit the vulnerability beyond what is necessary to demonstrate the issue

## Credit

We appreciate the work of security researchers. With your permission, we will publicly credit you in the release notes when a reported vulnerability is fixed.
