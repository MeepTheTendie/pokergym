#!/usr/bin/env node
// Poker Gym revenue model: traffic -> finishers -> buyers -> net revenue.
// Every input is an ASSUMPTION unless marked "observed". Re-run with new
// numbers from Wren's scoreboard: `node scripts/revenue-model.mjs`.
// Docs: docs/monetization/pricing-analysis.md, docs/monetization/business-plan.md

const KOFI_FEE = 0.05; // Ko-fi free plan on memberships + shop (Gold = 0%, $12/mo)
const STRIPE_PCT = 0.029;
const STRIPE_FIXED = 0.3;

export const net = (gross, kofiFee = KOFI_FEE) =>
  +(gross - gross * kofiFee - gross * STRIPE_PCT - STRIPE_FIXED).toFixed(2);

const PRICES = { monthly: 6, lifetime: 29 }; // proposal; crew vote Q3 decides
const LIFETIME_SHARE = 0.4; // share of buyers who pick lifetime
const CHURN = 0.12; // monthly members lost per month
const VISITOR_TO_FINISHER_NOW = 23 / 241; // observed, 30 days to Nov 8
const VISITOR_TO_FINISHER_TARGET = 0.14; // after #44 one-tap first hand
const TIP_NET_PER_100_FINISHERS = 1.5; // ~1 $5 tip per 300 finishers

// Monthly unique visitors, plan scenario (see marketing-plan.md ramp)
const RAMP = [
  ['Dec 2026', 650],
  ['Jan 2027', 1000],
  ['Feb 2027', 1500],
  ['Mar 2027', 2200],
  ['Apr 2027', 3000],
  ['May 2027', 3600],
  ['Jun 2027', 4200],
];

function run(label, conv, ramp = RAMP) {
  let members = 0;
  const rows = [];
  ramp.forEach(([month, visitors], i) => {
    const rate = i === 0 ? (VISITOR_TO_FINISHER_NOW + VISITOR_TO_FINISHER_TARGET) / 2 : VISITOR_TO_FINISHER_TARGET;
    const finishers = visitors * rate;
    const buyers = finishers * conv;
    const newMonthly = buyers * (1 - LIFETIME_SHARE);
    const newLifetime = buyers * LIFETIME_SHARE;
    members = members * (1 - CHURN) + newMonthly;
    const revMonthly = members * net(PRICES.monthly);
    const revLifetime = newLifetime * net(PRICES.lifetime);
    const tips = (finishers / 100) * TIP_NET_PER_100_FINISHERS;
    rows.push({
      month,
      visitors,
      finishers: Math.round(finishers),
      buyers: +buyers.toFixed(1),
      members: +members.toFixed(1),
      net: Math.round(revMonthly + revLifetime + tips),
    });
  });
  console.log(`\n## ${label} (buyers / new finisher = ${(conv * 100).toFixed(1)}%)`);
  console.log('| Month | Visitors | Finishers | New buyers | Monthly members | Net $/mo |');
  console.log('|---|---:|---:|---:|---:|---:|');
  for (const r of rows) console.log(`| ${r.month} | ${r.visitors} | ${r.finishers} | ${r.buyers} | ${r.members} | $${r.net} |`);
  return rows;
}

// "Push" ramp: what the $500-by-June goal requires (marketing-plan.md section 3)
const PUSH = [
  ['Dec 2026', 800],
  ['Jan 2027', 1500],
  ['Feb 2027', 2500],
  ['Mar 2027', 3500],
  ['Apr 2027', 4500],
  ['May 2027', 5200],
  ['Jun 2027', 6000],
];

// Steady-state visitors needed for a net target
function visitorsFor(target, conv) {
  // monthly members steady state = newMonthly / churn
  const perFinisher =
    conv * ((1 - LIFETIME_SHARE) * net(PRICES.monthly) / CHURN + LIFETIME_SHARE * net(PRICES.lifetime)) +
    TIP_NET_PER_100_FINISHERS / 100;
  return Math.round(target / perFinisher / VISITOR_TO_FINISHER_TARGET);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Net per sale on Ko-fi free plan: monthly $6 ->', net(6), '| lifetime $29 ->', net(29),
    '| $9 ->', net(9), '| $72 ->', net(72), '| $4.99 ->', net(4.99), '| $39 ->', net(39));
  console.log('Ko-fi Gold ($12/mo) pays for itself above $240 gross/mo.');
  run('Low', 0.01);
  run('Base', 0.025);
  run('High', 0.05);
  run('Push ramp, base conversion', 0.025, PUSH);
  run('Push ramp, high conversion', 0.05, PUSH);
  console.log('\n## Steady-state monthly visitors needed (at 14% visitor->finisher)');
  console.log('| Net target | 1% conv | 2.5% conv | 5% conv |');
  console.log('|---|---:|---:|---:|');
  for (const t of [100, 250, 500])
    console.log(`| $${t} | ${visitorsFor(t, 0.01)} | ${visitorsFor(t, 0.025)} | ${visitorsFor(t, 0.05)} |`);
}
