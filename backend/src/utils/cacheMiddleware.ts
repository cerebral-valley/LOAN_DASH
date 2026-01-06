import { Request, Response, NextFunction } from 'express';
import etag from 'etag';

/**
 * ETag middleware for HTTP caching
 * Generates ETags for GET requests and returns 304 Not Modified when appropriate
 */
export function etagMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only apply to GET and HEAD requests
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }

  const originalSend = res.send;

  res.send = function (body: any): Response {
    // Generate ETag for the response body
    const responseBody = typeof body === 'string' ? body : JSON.stringify(body);
    const generatedETag = etag(responseBody, { weak: true });

    // Set ETag header
    res.setHeader('ETag', generatedETag);

    // Set Cache-Control headers
    res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');

    // Check if client has a matching ETag
    const clientETag = req.headers['if-none-match'];
    
    if (clientETag === generatedETag) {
      // Client has the latest version, send 304 Not Modified
      res.status(304);
      return originalSend.call(res, '');
    }

    // Send the full response
    return originalSend.call(res, body);
  };

  next();
}

/**
 * Last-Modified middleware for time-based caching
 */
export function lastModifiedMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only apply to GET and HEAD requests
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }

  const originalJson = res.json;

  res.json = function (body: any): Response {
    // Set Last-Modified header to current time
    const lastModified = new Date().toUTCString();
    res.setHeader('Last-Modified', lastModified);

    // Check if client has If-Modified-Since header
    const ifModifiedSince = req.headers['if-modified-since'];
    
    if (ifModifiedSince) {
      const clientDate = new Date(ifModifiedSince);
      const serverDate = new Date(lastModified);
      
      // For stats endpoints, consider data unchanged within 60 seconds
      if (serverDate.getTime() - clientDate.getTime() < 60000) {
        res.status(304);
        return originalJson.call(res, {});
      }
    }

    return originalJson.call(res, body);
  };

  next();
}
