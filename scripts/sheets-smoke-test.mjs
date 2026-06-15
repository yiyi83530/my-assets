import http from 'node:http';
import { once } from 'node:events';

import {
  appendTransactionToSheets,
  fetchSheetsData,
  removeTransactionFromSheets,
  testSheetsConnection,
  upsertAssetsToSheets,
} from '../lib/sheets-client.js';

const state = {
  assets: [
    { id: 'a1', category: '台幣活存', name: 'Mock Bank', balance: 1000, isLiability: false },
  ],
  transactions: [
    {
      id: 't1',
      date: '2026-06-15',
      recordedAt: '2026-06-15T08:00:00.000Z',
      market: 'TWSE',
      symbol: '2330',
      stock: '2330 台積電',
      type: 'buy',
      qty: 1,
      price: 100,
      actualAmount: 100,
      note: '',
    },
  ],
};

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    const parsed = body ? JSON.parse(body) : {};
    const action = parsed.action;
    const payload = parsed.payload || {};

    res.setHeader('content-type', 'application/json');

    if (action === 'health') {
      res.end(JSON.stringify({ ok: true, data: { status: 'ok' } }));
      return;
    }

    if (action === 'getAll') {
      res.end(JSON.stringify({ ok: true, data: state }));
      return;
    }

    if (action === 'upsertAssets') {
      state.assets = payload.assets || [];
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (action === 'appendTransaction') {
      state.transactions.push(payload.transaction);
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (action === 'removeTransaction') {
      state.transactions = state.transactions.filter((tx) => tx.id !== payload.id);
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, message: `unknown action: ${action}` }));
  });
});

async function run() {
  server.listen(0);
  await once(server, 'listening');
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}`;

  await testSheetsConnection(url);

  const first = await fetchSheetsData(url);
  if (first.assets.length !== 1 || first.transactions.length !== 1) {
    throw new Error('Initial getAll payload mismatch');
  }

  await upsertAssetsToSheets(url, [
    { id: 'a2', category: '外幣活存', name: 'USD Bank', amount: 200, currency: 'usd', balance: 200 },
    { id: 'a3', category: '負債項目', name: 'Card', balance: 3000, isLiability: true },
  ]);

  await appendTransactionToSheets(url, {
    id: 't2',
    date: '2026-06-15',
    market: 'US',
    symbol: 'AAPL',
    stock: 'AAPL Apple',
    type: 'buy',
    qty: 2,
    price: 10,
    actualAmount: 20,
    note: 'smoke test',
  });

  await removeTransactionFromSheets(url, 't1');

  const second = await fetchSheetsData(url);
  if (second.assets.length !== 2) {
    throw new Error('Asset upsert failed');
  }
  if (second.assets[0].currency !== 'USD') {
    throw new Error('Foreign currency normalization failed');
  }
  if (second.transactions.length !== 1 || second.transactions[0].id !== 't2') {
    throw new Error('Transaction append/remove failed');
  }

  server.close();
  console.log('Sheets sync smoke test passed');
}

run().catch((error) => {
  server.close();
  console.error(error);
  process.exit(1);
});

