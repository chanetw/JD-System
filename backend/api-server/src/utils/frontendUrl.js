const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

export function normalizeBaseUrl(url) {
  if (!url) return null;

  try {
    return new URL(String(url).trim()).origin;
  } catch {
    return null;
  }
}

export function isLocalUrl(url) {
  const normalizedUrl = normalizeBaseUrl(url);

  if (!normalizedUrl) {
    return false;
  }

  try {
    return LOCAL_HOSTNAMES.has(new URL(normalizedUrl).hostname);
  } catch {
    return false;
  }
}

export function getRequestOrigin(req) {
  if (!req) {
    return null;
  }

  const getHeader = (name) => {
    if (typeof req.get === 'function') {
      return req.get(name);
    }

    return req.headers?.[String(name).toLowerCase()];
  };

  const origin = normalizeBaseUrl(getHeader('origin'));
  if (origin) {
    return origin;
  }

  const forwardedHost = String(getHeader('x-forwarded-host') || '').split(',')[0].trim();
  const forwardedProto = String(getHeader('x-forwarded-proto') || '').split(',')[0].trim();

  if (forwardedHost) {
    return normalizeBaseUrl(`${forwardedProto || 'https'}://${forwardedHost}`);
  }

  const host = String(getHeader('host') || '').split(',')[0].trim();
  if (!host) {
    return null;
  }

  const protocol = String(req.protocol || forwardedProto || 'http').split(',')[0].trim() || 'http';
  return normalizeBaseUrl(`${protocol}://${host}`);
}

export function getFrontendBaseUrl({ req } = {}) {
  const configuredUrl = normalizeBaseUrl(process.env.FRONTEND_URL);
  const requestOrigin = getRequestOrigin(req);

  if (configuredUrl && !isLocalUrl(configuredUrl)) {
    return configuredUrl;
  }

  if (requestOrigin && !isLocalUrl(requestOrigin)) {
    return requestOrigin;
  }

  if (configuredUrl) {
    return configuredUrl;
  }

  if (requestOrigin) {
    return requestOrigin;
  }

  return 'http://localhost:5173';
}

export function buildFrontendUrl(path = '', options = {}) {
  const normalizedPath = String(path || '').startsWith('/') ? String(path || '') : `/${String(path || '')}`;
  return `${getFrontendBaseUrl(options)}${normalizedPath}`;
}

export function buildLoginUrl(options = {}) {
  return buildFrontendUrl('/login', options);
}