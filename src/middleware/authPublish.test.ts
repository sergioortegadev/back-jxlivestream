import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// Mock config before importing the middleware
vi.mock('../config/config.js', () => ({
  default: {
    publishToken: 'secret-token',
  },
}));

// Import after mock is set up
const { default: authPublish } = await import('../middleware/authPublish.js');

function makeReq(authHeader?: string): Request {
  return {
    header: (name: string) => (name === 'authorization' ? authHeader : undefined),
  } as unknown as Request;
}

function makeRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe('authPublish middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it('calls next() when token is valid', () => {
    const req = makeReq('Bearer secret-token');
    const res = makeRes();

    authPublish(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('returns 401 when Authorization header is missing', () => {
    const req = makeReq(undefined);
    const res = makeRes();

    authPublish(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is wrong', () => {
    const req = makeReq('Bearer wrong-token');
    const res = makeRes();

    authPublish(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token has no Bearer prefix', () => {
    const req = makeReq('secret-token');
    const res = makeRes();

    authPublish(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
