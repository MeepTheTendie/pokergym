// No network, storage, identity, or gameplay data is collected here.
// This subject split (survey uses 'Poker Gym player feedback', quick links use
// 'Poker Gym feedback') is intentional, not drift.
export function feedbackDraft({ clarity, returnInterest, priceInterest, recurringInterest = '', note = '' }) {
  if (!['clear', 'confusing'].includes(clarity)
      || !['yes', 'maybe', 'no'].includes(returnInterest)
      || !['interested', 'unsure', 'free-only'].includes(priceInterest)
      || !['', 'interested', 'unsure', 'free-only'].includes(recurringInterest)) {
    throw new Error('Choose all three feedback answers.');
  }
  const body = [
    'Poker Gym voluntary player feedback',
    `First session: ${clarity}`,
    `Return for short training: ${returnInterest}`,
    `Possible one-time US$4.99 unlock: ${priceInterest}`,
    `Possible US$5/month fresh weekly drills and mistake review: ${recurringInterest || 'not answered'}`,
    'This is feedback on a possible offer, not a purchase or subscription.',
    '',
    `Confusing or missing: ${String(note).slice(0, 400).trim() || '(no comment)'}`,
  ].join('\n');
  return {
    body,
    githubHref: `https://github.com/MeepTheTendie/pokergym/issues/new?title=${encodeURIComponent('Poker Gym player feedback')}&body=${encodeURIComponent(body)}`,
    href: `mailto:wesleympennock@gmail.com?subject=${encodeURIComponent('Poker Gym player feedback')}&body=${encodeURIComponent(body)}`,
  };
}
