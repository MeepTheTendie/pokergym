# Artifact index

Large, dated outputs that don't belong inline in `PROGRESS.md` or the
`PokerGymControlDoc.md` Decision Log. Short status stays in the Control Doc.

Convention: `automation/artifacts/<agent>/<YYYY-MM-DD>-<slug>.md` (local, ignored)

| Date | Agent | File | Summary |
|---|---|---|---|
| 2026-10-26 | grok | `automation/artifacts/grok/2026-10-26-ops-audit.md` | Grok 14-day own-operations audit (Oct 13–26), read-only |
| 2026-10-26 | wren | `automation/artifacts/wren/2026-10-26-wren-operations-audit.md` | Wren 14-day own-operations audit (Oct 13–26), read-only; saved via repo API per assignment |

Rules:
- Update this index whenever you add an artifact.
- Keep artifacts immutable once committed; append a new file rather than editing.
- Short status still goes in the Control Doc per-assistant section.
- `automation/artifacts/` is gitignored by design: raw outputs stay local.

