#!/usr/bin/env bash
# Finish the repository shrink prepared on 2026-11-12 (afterwards, see docs/HISTORY.md).
#
# The slim history is already on GitHub: rewrite/sites-v98 (the published Sites v98 tree) and rewrite/main
# (old main at ee85274 without the non-Markdown files under design/, plus docs/HISTORY.md and docs/history/).
# This script moves whatever is on GitHub when you run it onto that slim history. It never applies patches:
# each new commit's tree is the original commit's own tree minus the non-Markdown files under design/, plus
# the history notes and the AGENTS.md re-clone note, so nothing can conflict.
#   - main: each first-parent commit after ee85274 (e.g. PRs merged since) becomes one slim commit on top of rewrite/main;
#   - every branch with unmerged work becomes one slim commit on top of the slim copy of its fork point;
#   - branches already merged into main, and the stale ones listed below, are deleted;
#   - tag sites-v98 moves to the slim v98 commit; tags sites-v84..v97 and the rewrite/* branches are deleted;
#   - commits made after the history notes were written are appended to docs/history/commits.md.
# All ref updates go in one atomic push with --force-with-lease: if anyone pushes while it runs, nothing changes
# and you run it again. Running it after it has succeeded does nothing. DRY_RUN=1 prints the plan only.
# Needs git 2.30+ and push access; downloads about 650 MB once.
set -euo pipefail
REPO=${REPO:-https://github.com/karmiphuc/iron-vow-lance-webgame.git}
OLD_MAIN=ee85274372948982001f8e685b95d5ec4d0ad292   # old main that rewrite/main is the slim copy of
NEW_V98=a1a9b7f0a4689e360ec65d50ca530f9f41db71b6    # slim Sites v98 commit, root of the slim history
STALE="feat/pixelfx-impact-electrical-collapse sites/iron-vow-candidate sites/iron-vow-next"
NOTE='- History was rewritten on 2026-11-12 to shrink the repository (see `docs/HISTORY.md`). Re-clone if your copy predates that, and never push a branch based on a pre-rewrite commit. Screenshots and capture JSON under `design/` are not kept in git history; commit only what the current phase needs.'
ANCHOR='Do not wait for later phases or a final merge to back up completed work.'

W=$(mktemp -d); trap 'rm -rf "$W"' EXIT
git init -q --bare "$W/r.git"; mkdir "$W/wt"; G(){ git --git-dir="$W/r.git" --work-tree="$W/wt" "$@"; }  # empty work tree: index ops only
G config user.name "$(git config user.name || echo iron-vow-rewrite)"; G config user.email "$(git config user.email || echo rewrite@localhost)"
echo "Reading GitHub..."; G ls-remote "$REPO" 'refs/heads/*' 'refs/tags/*' > "$W/refs"
head_of(){ awk -v r="refs/heads/$1" '$2==r{print $1}' "$W/refs"; }
MAIN=$(head_of main); NEWBASE=$(head_of rewrite/main)
echo "Fetching history (about 650 MB, once)..."
G fetch -q "$REPO" '+refs/heads/*:refs/remotes/o/*' '+refs/tags/*:refs/tags/*'
is_new(){ G merge-base --is-ancestor "$NEW_V98" "$1" 2>/dev/null; }

# slim TREEISH DOCS_COMMIT -> tree: TREEISH minus non-Markdown design/ files, plus DOCS_COMMIT's history notes, plus the AGENTS note
slim(){ local idx="$W/idx"
  GIT_INDEX_FILE=$idx G read-tree "$1"
  G ls-tree -r --name-only "$1" -- design | { grep -v '\.md$' || true; } | GIT_INDEX_FILE=$idx G update-index --force-remove --stdin
  G ls-tree -r --name-only "$1" -- docs/history | GIT_INDEX_FILE=$idx G update-index --force-remove --stdin
  G ls-tree -r "$2" -- docs/HISTORY.md docs/history | while read -r mode type sha path; do
    GIT_INDEX_FILE=$idx G update-index --add --cacheinfo "$mode,$sha,$path"; done
  if G cat-file -e "$1:AGENTS.md" 2>/dev/null && ! G show "$1:AGENTS.md" | grep -qF "History was rewritten on 2026-11-12"; then
    G show "$1:AGENTS.md" | awk -v a="$ANCHOR" -v n="$NOTE" '{print} index($0,a){print n}' > "$W/agents"
    GIT_INDEX_FILE=$idx G update-index --cacheinfo "100644,$(G hash-object -w "$W/agents"),AGENTS.md"; fi
  GIT_INDEX_FILE=$idx G write-tree; rm -f "$idx"; }
# mk TREE PARENT AUTHOR_FROM MSGFILE -> commit
mk(){ GIT_AUTHOR_NAME="$(G log -1 --format=%an "$3")" GIT_AUTHOR_EMAIL="$(G log -1 --format=%ae "$3")" \
      GIT_AUTHOR_DATE="$(G log -1 --format=%aI "$3")" G commit-tree "$1" -p "$2" -F "$4"; }
mapped(){ awk -v o="$1" '$1==o{print $2}' "$W/map"; }

if is_new "$MAIN" && [ -z "$NEWBASE" ]; then echo "Already on the slim history. Nothing to do."; exit 0; fi
[ -n "$NEWBASE" ] || { echo "STOP: rewrite/main is missing on GitHub. Ask Claude."; exit 1; }
PUSH=(); SUMMARY=""

# 1. main: slim copy of each first-parent commit after OLD_MAIN
if is_new "$MAIN"; then NEWMAIN=$MAIN; echo "$MAIN $MAIN" > "$W/map"; else
  G merge-base --is-ancestor "$OLD_MAIN" "$MAIN" || { echo "STOP: main ($MAIN) does not contain $OLD_MAIN. Ask Claude."; exit 1; }
  [ "$(slim "$OLD_MAIN" "$NEWBASE")" = "$(G rev-parse "$NEWBASE^{tree}")" ] || { echo "STOP: rewrite/main is not the slim copy of $OLD_MAIN. Ask Claude."; exit 1; }
  echo "$OLD_MAIN $NEWBASE" > "$W/map"; prev=$NEWBASE
  for c in $(G rev-list --reverse --first-parent "$OLD_MAIN..$MAIN"); do
    { G log -1 --format=%B "$c"; echo; echo "Slim copy of old commit $c."; } > "$W/msg"
    prev=$(mk "$(slim "$c" "$prev")" "$prev" "$c" "$W/msg"); echo "$c $prev" >> "$W/map"; done
  NEWMAIN=$prev
  # append commits the history notes do not list yet
  G show "$NEWMAIN:docs/history/commits.md" > "$W/c.md"; n=0
  for c in $(G rev-list --reverse --date-order $(awk '$2 ~ /^refs\/heads\// && $2 !~ /^refs\/heads\/rewrite\//{print $1}' "$W/refs") --not "$NEW_V98"); do
    s=${c:0:10}; grep -q "\`$s\`" "$W/c.md" && continue; n=$((n+1))
    where=main; G merge-base --is-ancestor "$c" "$MAIN" || where="unmerged: $(G branch -r --contains "$c" --format='%(refname:lstrip=3)' | tr '\n' ' ')"
    { printf '\n### `%s` %s · %s\n%s  \n*%s*\n' "$s" "$(G log -1 --format=%cs "$c")" "$(G log -1 --format=%an "$c")" "$(G log -1 --format=%s "$c")" "$where"
      [ "$(G rev-list --parents -n1 "$c" | wc -w)" -gt 2 ] || G diff-tree --no-commit-id --name-status -r "$c" | awk -F'\t' '$NF !~ /^design\// || $NF ~ /\.md$/ {printf "- %s `%s`\n",$1,$NF}'; } >> "$W/c.md"
  done
  if [ $n -gt 0 ]; then idx="$W/idx"; GIT_INDEX_FILE=$idx G read-tree "$NEWMAIN"
    GIT_INDEX_FILE=$idx G update-index --cacheinfo "100644,$(G hash-object -w "$W/c.md"),docs/history/commits.md"
    tree=$(GIT_INDEX_FILE=$idx G write-tree); rm -f "$idx"
    NEWMAIN=$(printf 'Record %s commits made after the history notes\n' "$n" | G commit-tree "$tree" -p "$NEWMAIN")
    echo "$MAIN $NEWMAIN" >> "$W/map"; fi
  PUSH+=("--force-with-lease=refs/heads/main:$MAIN" "$NEWMAIN:refs/heads/main"); SUMMARY+="  main: $MAIN -> $NEWMAIN"$'\n'
fi

# 2. other branches
while read -r sha ref; do b=${ref#refs/heads/}
  case "$b" in main|rewrite/*) continue;; esac
  is_new "$sha" && continue
  del=0; for s in $STALE; do [ "$b" = "$s" ] && del=1; done
  G merge-base --is-ancestor "$sha" "$MAIN" && del=1
  if [ $del = 1 ]; then PUSH+=("--force-with-lease=$ref:$sha" ":$ref"); SUMMARY+="  delete $b"$'\n'; continue; fi
  mb=$(G merge-base "$MAIN" "$sha"); parent=$(mapped "$mb")
  [ -n "$parent" ] || { echo "STOP: $b forked from main before $OLD_MAIN (at $mb). Merge main into it first. Nothing was pushed."; exit 1; }
  { G log -1 --format=%s "$sha"; echo; echo "Slim copy of old branch head $sha, squashing:"
    G log --reverse --no-merges --format='- %s' "$mb..$sha"; echo; echo "Non-Markdown files under design/ were dropped."; } > "$W/msg"
  nb=$(mk "$(slim "$sha" "$parent")" "$parent" "$sha" "$W/msg")
  PUSH+=("--force-with-lease=$ref:$sha" "$nb:$ref"); SUMMARY+="  $b: rebuilt as $nb on the slim copy of $(echo "$mb" | cut -c1-10)"$'\n'
done < <(awk '$2 ~ /^refs\/heads\//' "$W/refs")

# 3. tags and staging branches
[ "$(G rev-parse -q --verify 'refs/tags/sites-v98^{commit}' || true)" = "$NEW_V98" ] || { PUSH+=("+$NEW_V98:refs/tags/sites-v98"); SUMMARY+="  tag sites-v98 -> $NEW_V98"$'\n'; }
for n in $(seq 84 97); do awk -v r="refs/tags/sites-v$n" '$2==r{f=1} END{exit !f}' "$W/refs" && { PUSH+=(":refs/tags/sites-v$n"); SUMMARY+="  delete tag sites-v$n"$'\n'; }; done
while read -r sha ref; do PUSH+=("--force-with-lease=$ref:$sha" ":$ref"); SUMMARY+="  delete ${ref#refs/heads/}"$'\n'; done < <(awk '$2 ~ /^refs\/heads\/rewrite\//' "$W/refs")

echo; echo "Plan:"; printf '%s' "$SUMMARY"
[ ${#PUSH[@]} -gt 0 ] || { echo "Nothing to do."; exit 0; }
[ "${DRY_RUN:-0}" = 1 ] && { echo "(dry run: nothing pushed)"; exit 0; }
echo "Pushing (atomic)..."; G push --atomic "$REPO" "${PUSH[@]}"
echo; echo "Done. Everyone, Codex included, must re-clone; never push from a clone made before now."
