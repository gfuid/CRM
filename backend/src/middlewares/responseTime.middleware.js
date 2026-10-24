/**
 * High-precision Response Time Middleware
 * Injects X-Response-Time header and keeps real-time system performance stats
 */

const systemMetrics = {
  totalRequests: 0,
  averageResponseTimeMs: 0,
  lastResponseTimeMs: 0,
  peakResponseTimeMs: 0,
  statusCodes: {
    '2xx': 0,
    '3xx': 0,
    '4xx': 0,
    '5xx': 0,
  },
  endpoints: {},
  userRequests: {},
  history: [],
  startedAt: new Date().toISOString(),
  reset() {
    this.totalRequests = 0;
    this.averageResponseTimeMs = 0;
    this.lastResponseTimeMs = 0;
    this.peakResponseTimeMs = 0;
    this.statusCodes = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
    this.endpoints = {};
    this.userRequests = {};
    this.history = [];
    this.startedAt = new Date().toISOString();
  },
};

const responseTimeMiddleware = (req, res, next) => {
  const startHrTime = process.hrtime();

  res.on('finish', () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedTimeInMs = (elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6).toFixed(2);
    const ms = parseFloat(elapsedTimeInMs);

    systemMetrics.totalRequests += 1;
    if (req.user?.id) {
      systemMetrics.userRequests[req.user.id] = (systemMetrics.userRequests[req.user.id] || 0) + 1;
    }
    systemMetrics.lastResponseTimeMs = ms;
    if (ms > systemMetrics.peakResponseTimeMs) {
      systemMetrics.peakResponseTimeMs = ms;
    }

    // Exponential moving average for smooth avg
    systemMetrics.averageResponseTimeMs = parseFloat(
      (systemMetrics.averageResponseTimeMs * 0.95 + ms * 0.05).toFixed(2)
    );

    // Track status code breakdown
    const codeGroup = Math.floor(res.statusCode / 100) + 'xx';
    if (systemMetrics.statusCodes[codeGroup] !== undefined) {
      systemMetrics.statusCodes[codeGroup] += 1;
    }

    // Track endpoint aggregated performance
    const rawPath = (req.baseUrl || '') + (req.path || req.url || '');
    const cleanPath = rawPath.split('?')[0].replace(/\/[0-9a-fA-F_-]{10,}/g, '/:id');
    const endpointKey = `${req.method} ${cleanPath}`;
    if (!systemMetrics.endpoints[endpointKey]) {
      systemMetrics.endpoints[endpointKey] = {
        hits: 0,
        totalMs: 0,
        avgMs: 0,
        peakMs: 0,
        lastStatus: res.statusCode,
      };
    }
    const ep = systemMetrics.endpoints[endpointKey];
    ep.hits += 1;
    ep.totalMs += ms;
    ep.avgMs = parseFloat((ep.totalMs / ep.hits).toFixed(2));
    if (ms > ep.peakMs) ep.peakMs = ms;
    ep.lastStatus = res.statusCode;

    // Keep last 100 data points for developer observability
    if (systemMetrics.history.length > 100) {
      systemMetrics.history.shift();
    }
    systemMetrics.history.push({
      path: rawPath.split('?')[0],
      method: req.method,
      status: res.statusCode,
      durationMs: ms,
      timestamp: new Date().toISOString(),
    });
  });

  // Attach header
  const originalSend = res.send;
  res.send = function (...args) {
    const elapsed = process.hrtime(startHrTime);
    const ms = (elapsed[0] * 1000 + elapsed[1] / 1e6).toFixed(2);
    res.setHeader('X-Response-Time', `${ms}ms`);
    return originalSend.apply(this, args);
  };

  next();
};

module.exports = {
  responseTimeMiddleware,
  systemMetrics,
};
