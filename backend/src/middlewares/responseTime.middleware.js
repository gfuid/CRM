/**
 * High-precision Response Time Middleware
 * Injects X-Response-Time header and keeps real-time system performance stats
 */

const systemMetrics = {
  totalRequests: 0,
  averageResponseTimeMs: 0,
  lastResponseTimeMs: 0,
  peakResponseTimeMs: 0,
  history: [],
};

const responseTimeMiddleware = (req, res, next) => {
  const startHrTime = process.hrtime();

  res.on('finish', () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedTimeInMs = (elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6).toFixed(2);
    const ms = parseFloat(elapsedTimeInMs);

    systemMetrics.totalRequests += 1;
    systemMetrics.lastResponseTimeMs = ms;
    if (ms > systemMetrics.peakResponseTimeMs) {
      systemMetrics.peakResponseTimeMs = ms;
    }

    // Exponential moving average for smooth avg
    systemMetrics.averageResponseTimeMs = parseFloat(
      (systemMetrics.averageResponseTimeMs * 0.95 + ms * 0.05).toFixed(2)
    );

    // Keep last 50 data points for admin charts
    if (systemMetrics.history.length > 50) {
      systemMetrics.history.shift();
    }
    systemMetrics.history.push({
      path: req.baseUrl + req.path,
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
