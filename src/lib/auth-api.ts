import { NextRequest } from 'next/server';

export function authenticateApi(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.split(' ')[1];
  const secretKey = process.env.API_SECRET_KEY;

  if (!secretKey) {
    console.error('API_SECRET_KEY is not defined in environment variables.');
    return false;
  }

  return token === secretKey;
}
