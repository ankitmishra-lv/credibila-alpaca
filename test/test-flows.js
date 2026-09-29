#!/usr/bin/env node

const { ensureServer, stopServer } = require('./helpers/server');
const { api, apiRaw } = require('./helpers/api');
const { banner, step, success, fail, warn, data, result, summary } = require('./helpers/output');

const { testBuy } = require('./flows/buy');
const { testSell } = require('./flows/sell');
const { testCancel } = require('./flows/cancel');
const { testConfirmation } = require('./flows/confirm');
const { testOrders } = require('./flows/orders');
const { testPortfolio } = require('./flows/portfolio');
const { testNotifications } = require('./flows/notify');

const config = {
  symbol: process.env.TEST_SYMBOL || 'AAPL',
  qty: process.env.TEST_QTY || '0.01',
  limitPrice: process.env.TEST_LIMIT_PRICE || '150.00',
  reuseAccountId: process.env.TEST_ACCOUNT_ID || null,
  sweepAccountId: process.env.ALPACA_SWEEP_ACCOUNT_ID || null,
};

async function main() {
  banner('Alpaca Public Markets Flow Test Application');

  banner('Starting / Checking Backend Server');
  let baseUrl;
  try {
    const srv = await ensureServer();
    baseUrl = srv.baseUrl;
    if (srv.started) success('Server started by test runner');
    else success('Server already running');
  } catch (e) {
    fail(`Could not start/find server: ${e.message}`);
    process.exit(1);
  }

  let accountId;

  if (config.reuseAccountId) {
    step(`Using existing account ID: ${config.reuseAccountId}`);
    try {
      const acct = await api(baseUrl, config.reuseAccountId, '');
      accountId = config.reuseAccountId;
      success(`Account found: ${acct.account_number} (${acct.status})`);
    } catch (e) {
      fail(`Could not load account ${config.reuseAccountId}: ${e.message}`);
      process.exit(1);
    }
  } else {
    accountId = await createTestAccount(baseUrl);
    if (!accountId) {
      fail('No account available for testing. Set TEST_ACCOUNT_ID env var to reuse one.');
      await stopServer();
      process.exit(1);
    }
  }

  if (config.sweepAccountId) {
    await fundAccount(baseUrl, accountId, config.sweepAccountId);
  } else {
    warn('No ALPACA_SWEEP_ACCOUNT_ID set — skipping funding. Orders may fail for insufficient buying power.');
  }

  const context = {};

  context.buyResult = await testBuy(baseUrl, accountId, config);
  if (context.buyResult.ok && context.buyResult.order) {
    await new Promise((r) => setTimeout(r, 2000));
  }

  context.sellResult = await testSell(baseUrl, accountId, config, context.buyResult);
  if (context.sellResult.ok && context.sellResult.order) {
    await new Promise((r) => setTimeout(r, 2000));
  }

  await testCancel(baseUrl, accountId, config);
  await new Promise((r) => setTimeout(r, 1000));

  await testConfirmation(baseUrl, accountId, context);
  await new Promise((r) => setTimeout(r, 1000));

  await testOrders(baseUrl, accountId);
  await new Promise((r) => setTimeout(r, 1000));

  await testPortfolio(baseUrl, accountId);
  await new Promise((r) => setTimeout(r, 1000));

  await testNotifications(baseUrl, accountId, context);

  summary();
  await stopServer();
}

async function createTestAccount(baseUrl) {
  banner('Setting Up: Create Test Account');

  const email = `test-${Date.now()}@example.com`;
  const given = 'Test';
  const family = 'User';

  step(`Creating account for ${email} via POST /api/accounts`);
  step('Linking email via POST /api/auth/signup');

  let account;
  try {
    account = await apiRaw(baseUrl, '/api/accounts', {
      method: 'POST',
      body: {
        contact: {
          email_address: email,
          phone_number: '555-666-7788',
          street_address: ['20 N San Mateo Dr'],
          city: 'San Mateo',
          state: 'CA',
          postal_code: '94401',
          country: 'USA',
        },
        identity: {
          given_name: given,
          family_name: family,
          date_of_birth: '1990-01-01',
          tax_id_type: 'USA_SSN',
          tax_id: '321-54-9870',
          country_of_citizenship: 'USA',
          country_of_birth: 'USA',
          country_of_tax_residence: 'USA',
          funding_source: ['employment_income'],
        },
        disclosures: {
          is_control_person: false,
          is_affiliated_exchange_or_finra: false,
          is_politically_exposed: false,
          immediate_family_exposed: false,
        },
        agreements: [
          { agreement: 'margin_agreement', signed_at: new Date().toISOString(), ip_address: '127.0.0.1' },
          { agreement: 'account_agreement', signed_at: new Date().toISOString(), ip_address: '127.0.0.1' },
          { agreement: 'customer_agreement', signed_at: new Date().toISOString(), ip_address: '127.0.0.1' },
        ],
      },
    });
  } catch (e) {
    fail(`Account creation failed: ${e.message}`);
    return null;
  }

  result('POST /api/accounts', true);
  data('Created account', { id: account.id, account_number: account.account_number, status: account.status });
  success(`Account created: #${account.account_number} (${account.status})`);

  const accountId = account.id;

  try {
    await apiRaw(baseUrl, '/api/auth/signup', {
      method: 'POST',
      body: { email, password: 'testpass123', account_id: accountId },
    });
    result('POST /api/auth/signup', true);
    success('Account linked to email for login');
  } catch (e) {
    warn(`Signup link skipped: ${e.message}`);
  }

  console.log(`\n  ${chalk_gray(`To reuse this account later, set TEST_ACCOUNT_ID=${accountId}`)}`);

  return accountId;
}

const chalk_gray = (s) => `\x1b[90m${s}\x1b[0m`;

async function fundAccount(baseUrl, accountId, sweepId) {
  banner('Setting Up: Fund Test Account');

  step(`Journaling $50,000 from sweep account ${sweepId}`);
  step('POST /api/journals');

  try {
    const journal = await apiRaw(baseUrl, '/api/journals', {
      method: 'POST',
      body: {
        to_account: accountId,
        from_account: sweepId,
        entry_type: 'JNLC',
        amount: '50000',
      },
    });
    result('POST /api/journals', true);
    data('Journal response', journal);
    success('Funding journal submitted');
    await new Promise((r) => setTimeout(r, 3000));
  } catch (e) {
    warn(`Funding failed: ${e.message}`);
    warn('Tests may fail due to insufficient buying power.');
  }
}

main().catch(async (e) => {
  console.error(e);
  fail(`Test runner crashed: ${e.message}`);
  await stopServer();
  process.exit(1);
});
