# Git conventions in this repo

- **One logical fix per commit.** This history is made of small, independently-revertable commits
  (`git log --oneline` reads like a changelog) — e.g. the Tailwind `@source` fix, the table
  `whitespace-nowrap` fix, and the mobile nav bar landed as three separate commits even though
  they were found in the same review pass, because they're three independent bugs. Don't bundle
  unrelated fixes into one commit for convenience. It's fine for one commit to touch multiple
  files when they're genuinely one change (a type + its one consumer + its one test).
- **Commit message body explains *why*, matched to the actual root cause** — not a changelog of
  which files changed. Follow the existing style: first line is an imperative summary; the body
  names the symptom a user would have seen, the actual mechanism that caused it (with a file/line
  reference where useful), and what the fix does differently. See any commit from
  `git log --oneline` for the register this repo writes in.
- Windows checkout: `git status`/`git commit` printing
  `warning: ... LF will be replaced by CRLF ...` is normal (`core.autocrlf` on a Windows checkout)
  and not something to fix.
- Only commit when asked, or when it's the obvious next step of a task the user explicitly framed
  as "fix these and commit each one" (as happened in the design-review pass this repo's history
  came from). When in doubt, finish the change, verify it, and ask.
