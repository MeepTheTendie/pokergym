import test from 'node:test';
import assert from 'node:assert/strict';
import { feedbackDraft } from '../web/feedback.js';

test('voluntary feedback safely encodes text and records intent without implying payment', () => {
  const note = 'Missing: A&B?\n日本語 #cards';
  const draft = feedbackDraft({ clarity: 'confusing', returnInterest: 'maybe', priceInterest: 'free-only', note });
  const url = new URL(draft.href);
  assert.equal(url.pathname, 'wesleympennock@gmail.com');
  assert.equal(url.searchParams.get('body'), draft.body);
  const github = new URL(draft.githubHref);
  assert.equal(github.origin, 'https://github.com');
  assert.equal(github.pathname, '/MeepTheTendie/pokergym/issues/new');
  assert.equal(github.searchParams.get('body'), draft.body);
  assert.equal(github.searchParams.get('title'), 'Poker Gym player feedback');
  assert.deepEqual([...github.searchParams.keys()], ['title', 'body']);
  assert.match(draft.body, /not a purchase or subscription/);
  assert.ok(draft.body.includes('Possible one-time US$4.99 unlock'));
  assert.ok(draft.body.includes('Possible US$5/month fresh weekly drills and mistake review: not answered'));
  assert.ok(draft.body.endsWith(note));
  assert.equal([...url.searchParams.keys()].join(','), 'subject,body');
  assert.throws(() => feedbackDraft({ clarity: '', returnInterest: 'yes', priceInterest: 'interested' }));
  const bounded = feedbackDraft({ clarity: 'clear', returnInterest: 'yes', priceInterest: 'interested', note: 'x'.repeat(500) });
  assert.ok(bounded.body.endsWith('x'.repeat(400)));
  assert.ok(!bounded.body.endsWith('x'.repeat(401)));
});

test('recurring interest remains distinct from one-time interest and unanswered feedback', () => {
  for (const recurringInterest of ['', 'interested', 'unsure', 'free-only']) {
    const draft = feedbackDraft({ clarity: 'clear', returnInterest: 'yes', priceInterest: 'free-only', recurringInterest });
    assert.ok(draft.body.includes('Possible one-time US$4.99 unlock: free-only'));
    assert.ok(draft.body.includes(`Possible US$5/month fresh weekly drills and mistake review: ${recurringInterest || 'not answered'}`));
    assert.equal(new URL(draft.githubHref).searchParams.get('body'), draft.body);
    assert.equal(new URL(draft.href).searchParams.get('body'), draft.body);
  }
  assert.throws(() => feedbackDraft({ clarity: 'clear', returnInterest: 'yes', priceInterest: 'interested', recurringInterest: 'paid' }));
});
