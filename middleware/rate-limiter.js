const ipRequestLogs = new Map();

export function inMemorySlidingRateLimiter(options = {}) {
  const windowSeconds = options.windowSeconds || 60;
  const maxRequests = options.maxRequests || 5;

  return (req, res, next) => {
    const ip = req.headers["x-forwarded-for"].split(", ")[0];
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    if (!ipRequestLogs.has(ip)) {
      ipRequestLogs.set(ip, []);
    }

    const timestamps = ipRequestLogs.get(ip);

    // Remove old timestamps outside the window
    while (timestamps.length && timestamps[0] < windowStart) {
      timestamps.shift();
    }

    if (timestamps.length >= maxRequests) {
      const retryIn = Math.ceil(
        (timestamps[0] + windowSeconds * 1000 - now) / 1000
      );
      return res
        .status(429)
        .set("Retry-After", retryIn)
        .json({
          error: `Rate limit exceeded. Try again in ${retryIn} seconds.`,
        });
    }

    timestamps.push(now);
    next();
  };
}
