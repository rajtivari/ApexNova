import jwt from 'jsonwebtoken';

const JWT_ISSUER = 'apexnova-api';
const JWT_AUDIENCE = 'apexnova-web';

export function authenticate(req, res, next) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || secret === 'replace-me') {
    return res.status(503).json({ error: 'Authentication is not configured' });
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    req.user = jwt.verify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ['HS256'],
    });
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export const roleGuard = (...roles) => (req, res, next) => (
  roles.includes(req.user?.role)
    ? next()
    : res.status(403).json({ error: 'Insufficient role' })
);

export const moneyRouteGuard = roleGuard('SUPER_ADMIN');
