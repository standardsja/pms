// server/auth/azureAuth.mjs
// Azure AD (Entra ID) token validation middleware (scaffold)
// Safe by default: not imported/used until you wire it in server/index.mjs

import jwt from 'jsonwebtoken';

// Simple in-memory JWKS cache by tenant
const jwksCache = new Map();

async function fetchJwks(tenantId) {
  const cached = jwksCache.get(tenantId);
  if (cached && Date.now() - cached.fetchedAt < 60 * 60 * 1000) {
    return cached.data;
  }
  const url = `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch JWKS: ${resp.status}`);
  const data = await resp.json();
  jwksCache.set(tenantId, { data, fetchedAt: Date.now() });
  return data;
}

function x5cToCert(x5c) {
  if (!x5c || !x5c.length) return null;
  return `-----BEGIN CERTIFICATE-----\n${x5c[0]}\n-----END CERTIFICATE-----`;
}

function parseRoleMap(raw) {
  const map = {};
  if (!raw) return map;
  raw.split(';').map(s => s.trim()).filter(Boolean).forEach(pair => {
    const [internal, guid] = pair.split(':');
    if (internal && guid) map[guid] = internal;
  });
  return map;
}

export function azureAuthMiddleware(options = {}) {
  const {
    tenantId = process.env.AZURE_AD_TENANT_ID,
    audience = process.env.AZURE_AD_API_AUDIENCE || process.env.AZURE_AD_CLIENT_ID,
    allowedDomain = process.env.AZURE_AD_REQUIRE_EMAIL_DOMAIN,
    roleMapRaw = process.env.AZURE_AD_ROLE_MAP,
  } = options;

  if (!tenantId || !audience) {
    console.warn('[azureAuth] Missing tenantId or audience; middleware will reject all requests');
  }

  const groupMap = parseRoleMap(roleMapRaw);

  return async function (req, res, next) {
    try {
      const auth = req.headers.authorization || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
      if (!token) return res.status(401).json({ message: 'Missing bearer token' });

      const decoded = jwt.decode(token, { complete: true });
      const kid = decoded?.header?.kid;
      if (!kid) return res.status(401).json({ message: 'Invalid token header' });

      const jwks = await fetchJwks(tenantId);
      const key = jwks.keys.find(k => k.kid === kid);
      if (!key) return res.status(401).json({ message: 'Signing key not found' });
      const cert = x5cToCert(key.x5c);
      if (!cert) return res.status(401).json({ message: 'Invalid signing certificate' });

      const claims = jwt.verify(token, cert, {
        audience,
        issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      });

      const email = (claims.preferred_username || claims.upn || claims.email || '').toLowerCase();
      if (allowedDomain && (!email || !email.endsWith(`@${allowedDomain.toLowerCase()}`))) {
        return res.status(403).json({ message: 'Email domain not allowed' });
      }

      // Build internal roles from app roles + group mappings
      const internalRoles = new Set();
      (claims.roles || []).forEach(r => internalRoles.add(r));
      (claims.groups || []).forEach(g => { if (groupMap[g]) internalRoles.add(groupMap[g]); });

      req.user = {
        provider: 'AAD',
        oid: claims.oid,
        tid: claims.tid,
        email,
        name: claims.name || email,
        roles: Array.from(internalRoles),
        raw: claims,
      };

      next();
    } catch (e) {
      console.error('[azureAuth]', e);
      return res.status(401).json({ message: 'Unauthorized' });
    }
  };
}

export default azureAuthMiddleware;
