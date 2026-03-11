import 'dotenv/config';

export const POLYGON_API_KEY = process.env.POLYGON_API_KEY || '';
export const GEMINI_API_KEY  = process.env.GEMINI_API_KEY  || '';

if (!POLYGON_API_KEY) console.warn('⚠️  POLYGON_API_KEY not set — gap scanner, theme performance, and watchlist prices will be unavailable');
if (!GEMINI_API_KEY)  console.warn('⚠️  GEMINI_API_KEY not set  — pre-market report, earnings preview, and AI features will be unavailable');
