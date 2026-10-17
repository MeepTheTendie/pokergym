// No network, storage, identity, or gameplay data is collected here.
// This subject split (survey uses 'Poker Gym player feedback', quick links use
// 'Poker Gym feedback') is intentional, not drift.
// No pricing or willingness-to-pay question is asked: Poker Gym has no
// subscriptions, and paid features are only considered from unprompted requests.
// Extra legacy fields (e.g. old price answers) are ignored.
export function feedbackDraft({ clarity, returnInterest, note = '' }) {
  if (!['clear', 'confusing'].includes(clarity)
      || !['yes', 'maybe', 'no'].includes(returnInterest)) {
    throw new Error('Choose both feedback answers.');
  }
  const body = [
    'Poker Gym voluntary player feedback',
    `First session: ${clarity}`,
    `Return for short training: ${returnInterest}`,
    '',
    `Confusing or missing: ${String(note).slice(0, 400).trim() || '(no comment)'}`,
  ].join('\n');
  return {
    body,
    githubHref: `https://github.com/MeepTheTendie/pokergym/issues/new?title=${encodeURIComponent('Poker Gym player feedback')}&body=${encodeURIComponent(body)}`,
    href: `mailto:meep@mail.grokbot.com?subject=${encodeURIComponent('Poker Gym player feedback')}&body=${encodeURIComponent(body)}`,
  };
}
