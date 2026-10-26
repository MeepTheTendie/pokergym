import test from 'node:test';
import assert from 'node:assert/strict';
import { feedbackDraft } from '../web/feedback.js';

test('voluntary feedback safely encodes text and records intent without implying payment', () => {
  const note = 'Missing: A&B?\n日本語 #cards';
  const draft = feedbackDraft({ clarity: 'confusing', returnInterest: 'maybe', note });
  const url = new URL(draft.href);
  assert.equal(url.pathname, 'meep@mail.grokbot.com');
  assert.equal(url.searchParams.get('body'), draft.body);
  const github = new URL(draft.githubHref);
  assert.equal(github.origin, 'https://github.com');
  assert.equal(github.pathname, '/MeepTheTendie/pokergym/issues/new');
  assert.equal(github.searchParams.get('body'), draft.body);
  assert.equal(github.searchParams.get('title'), 'Play Poker Gym player feedback');
  assert.deepEqual([...github.searchParams.keys()], ['title', 'body']);
  assert.doesNotMatch(draft.body, /US\$|price|unlock|subscri|month/i);
  assert.ok(draft.body.endsWith(note));
  assert.equal([...url.searchParams.keys()].join(','), 'subject,body');
  assert.throws(() => feedbackDraft({ clarity: '', returnInterest: 'yes'}));
  const bounded = feedbackDraft({ clarity: 'clear', returnInterest: 'yes', note: 'x'.repeat(500) });
  assert.ok(bounded.body.endsWith('x'.repeat(400)));
  assert.ok(!bounded.body.endsWith('x'.repeat(401)));
});

test('legacy pricing fields are ignored and never appear in the draft', () => {
  const draft = feedbackDraft({ clarity: 'clear', returnInterest: 'yes', priceInterest: 'interested', recurringInterest: 'paid' });
  assert.doesNotMatch(draft.body, /US\$|price|unlock|subscri|month|interested|paid/i);
  assert.equal(new URL(draft.githubHref).searchParams.get('body'), draft.body);
  assert.equal(new URL(draft.href).searchParams.get('body'), draft.body);
});
