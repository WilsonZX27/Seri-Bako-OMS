# Browser annotations 21 — 2026-11-02

Source: user's 21 marked Preview screenshots, latest batch (not previous 17).
Branch: codex/annotations21-followup-20261102; base57fb6834.
Mode: Operate. Preserve house components, white rows and separators, compact numeric fields and flexible comments. All changes local; no SQL or business writes or deployment.

Initial source fixes: #1 remove alternating receiving/printed production fills; #2 accessible destination icon buttons; #7 move hidden-product filter out of column heading; #8 keep on-order yield1 editable; #9–10 compact desktop numeric columns with inline reason/comment; #12 remove hardcoded7-day label; #13 sticky data header; #14 let data list use panel height; #19 move pending review above balances.
These are code changes, not visual acceptance. Remaining annotations and Reject/OT/notification diagnosis open. #3 requested AST prefix conflicts with prior AT candidate: do not silently activate or change persisted numbering. #17 matching broader product visibility exists only in unreleased combined candidate; real forecast/configuration not rewritten.

No business-rule changes in this initial patch. Current user decision supersedes prior alternating-row styling. Target390/820/1440 rendered checks pending. Earlier combined tests do not validate this new patch.
