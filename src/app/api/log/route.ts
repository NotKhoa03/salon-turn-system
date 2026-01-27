import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { level, message, category, data, duration } = body;

    const timestamp = new Date().toISOString();
    const prefix = category ? `[${category}]` : '';

    // Format duration if present
    const durationStr = duration !== undefined
      ? ` (${duration > 1000 ? (duration / 1000).toFixed(2) + 's' : duration.toFixed(0) + 'ms'})`
      : '';

    // Log to server console (shows in Vercel Logs)
    const logMessage = `${timestamp} ${prefix} ${message}${durationStr}`;

    switch (level) {
      case 'error':
        console.error(logMessage, data || '');
        break;
      case 'warn':
        console.warn(logMessage, data || '');
        break;
      case 'info':
        console.info(logMessage, data || '');
        break;
      default:
        console.log(logMessage, data || '');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logging error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

// Disable caching for this endpoint
export const dynamic = 'force-dynamic';
