import { NextResponse } from 'next/server';

const EXCHANGE_RATE_API_URL = 'https://api.exchangerate.host/latest?base=USD&symbols=TWD';

export async function GET() {
  try {
    return NextResponse.json({ usdToTwd: 30.0 });
  } catch (error) {
    console.error('Error in exchange rate API route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

