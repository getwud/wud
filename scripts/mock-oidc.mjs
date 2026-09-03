import http from 'http';
import crypto from 'crypto';

// Generate RSA key pair in memory on startup
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
});

const jwk = publicKey.export({ format: 'jwk' });
jwk.kid = 'mock-key-1';
jwk.use = 'sig';
jwk.alg = 'RS256';

const server = http.createServer((req, res) => {
  const host = req.headers.host || 'localhost:8080';
  const url = new URL(req.url, `http://${host}`);
  res.setHeader('Content-Type', 'application/json');

  if (url.pathname === '/.well-known/openid-configuration') {
    res.writeHead(200);
    res.end(
      JSON.stringify({
        issuer: `http://${host}`,
        authorization_endpoint:
          process.env.AUTH_ENDPOINT || `http://${host}/authorize`,
        token_endpoint: `http://${host}/token`,
        userinfo_endpoint: `http://${host}/userinfo`,
        jwks_uri: `http://${host}/jwks`,
        response_types_supported: ['code'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        code_challenge_methods_supported: ['S256'],
        scopes_supported: ['openid', 'email', 'profile'],
      }),
    );
    return;
  }

  if (url.pathname === '/jwks') {
    res.writeHead(200);
    res.end(JSON.stringify({ keys: [jwk] }));
    return;
  }

  if (url.pathname === '/authorize') {
    const redirectUri = url.searchParams.get('redirect_uri');
    const state = url.searchParams.get('state') || '';
    if (!redirectUri) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'missing_redirect_uri' }));
      return;
    }
    const target = new URL(redirectUri);
    target.searchParams.set('code', 'mock_auth_code_123');
    target.searchParams.set('state', state);
    res.writeHead(302, { Location: target.toString() });
    res.end();
    return;
  }

  if (url.pathname === '/token' && req.method === 'POST') {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(
      JSON.stringify({ alg: 'RS256', kid: 'mock-key-1', typ: 'JWT' }),
    ).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        iss: `http://${host}`,
        sub: 'mock-user-id',
        aud: 'test-client',
        exp: now + 3600,
        iat: now,
        email: 'oidcuser@example.com',
      }),
    ).toString('base64url');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${header}.${payload}`);
    const signature = sign.sign(privateKey).toString('base64url');
    const idToken = `${header}.${payload}.${signature}`;

    res.writeHead(200);
    res.end(
      JSON.stringify({
        access_token: 'mock-access-token-123',
        token_type: 'Bearer',
        expires_in: 3600,
        id_token: idToken,
      }),
    );
    return;
  }

  if (url.pathname === '/userinfo') {
    res.writeHead(200);
    res.end(
      JSON.stringify({
        sub: 'mock-user-id',
        email: 'oidcuser@example.com',
        name: 'Mock OIDC User',
      }),
    );
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'not_found' }));
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Mock OIDC server listening on port ${PORT}`);
});
