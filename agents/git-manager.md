---
description: Git-менеджер: ветки, коммиты, push; без merge/rebase/cherry-pick
mode: all
model: openrouter/deepseek/deepseek-v4.1-flash-1017
temperature: 0.1
steps: 60
permission:
  edit:
    "*": deny
  bash:
    "*": deny
    ls: allow
    "ls *": allow
    cat: allow
    "cat *": allow
    head: allow
    "head *": allow
    tail: allow
    "tail *": allow
    rg: allow
    "rg *": allow
    wc: allow
    "wc *": allow
    "git status": allow
    "git status *": allow
    "git diff": allow
    "git diff *": allow
    "git log": allow
    "git log *": allow
    "git show": allow
    "git show *": allow
    "git branch --list": allow
    "git branch -a": allow
    "git branch -vv": allow
    "git branch --show-current": allow
    "git remote -v": allow
    "git rev-parse *": allow
    "git ls-files *": allow
    "git fetch": allow
    "git fetch *": allow
    "git pull --ff-only": allow
    "git pull --ff-only *": allow
    "git add *": allow
    "git commit -m *": allow
    "git switch -c *": allow
    "git switch *": allow
    "git push origin *": allow
    "git merge": deny
    "git merge *": deny
    "git rebase *": deny
    "git cherry-pick *": deny
    "git reset *": deny
    "git revert *": deny
    "git clean *": deny
    "git checkout -- *": deny
    "git checkout .": deny
    "git restore *": deny
    "git stash *": deny
    "git branch -d *": deny
    "git branch -D *": deny
    "git branch -m *": deny
    "git tag *": deny
    "git worktree *": deny
    "git submodule *": deny
    "git config *": deny
    "git gc *": deny
    "git filter-branch *": deny
    "git reflog expire *": deny
    "git switch -f*": deny
    "git switch * -f*": deny
    "git switch --force*": deny
    "git switch * --force*": deny
    "git switch --di*": deny
    "git switch * --di*": deny
    "git switch -C*": deny
    "git switch * -C*": deny
    "git add -A": deny
    "git add -A *": deny
    "git add --all*": deny
    "git add --a*": deny
    "git add -p": deny
    "git add -p *": deny
    "git add -i": deny
    "git add -i *": deny
    "git add --patch*": deny
    "git add --interactive*": deny
    "git add -f*": deny
    "git add * -f*": deny
    "git add .": deny
    "git add . *": deny
    "git commit --amend*": deny
    "git commit * --amend*": deny
    "git commit --no-verify*": deny
    "git commit * --no-verify*": deny
    "git commit * --no-v*": deny
    "git commit * --am*": deny
    "git commit * -n*": deny
    "git commit * --edit*": deny
    "git commit * -e*": deny
    "git commit * -c*": deny
    "git commit * --reedit-message*": deny
    "git push --force*": deny
    "git push -f *": deny
    "git push --delete *": deny
    "git push --mirror *": deny
    "git push --tags": deny
    "git push * -*": deny
    "git push * +*": deny
    "git push * :*": deny
    "git push * main": deny
    "git push * main *": deny
    "git push *:main": deny
    "git push * master": deny
    "git push * master *": deny
    "git push *:master": deny
    "git push * develop": deny
    "git push * develop *": deny
    "git push *:develop": deny
    "git push * test": deny
    "git push * test *": deny
    "git push *:test": deny
    "git push * trunk": deny
    "git push * trunk *": deny
    "git push *:trunk": deny
    "git push * release": deny
    "git push * release *": deny
    "git push *:release": deny
    "git push * refs/*": deny
    "git push origin HEAD": deny
    "git switch -m*": deny
    "git switch * -m*": deny
    "git switch --merge*": deny
    "git switch * --merge*": deny
    "git switch --orphan*": deny
    "git switch * --orphan*": deny
    "git switch --guess*": deny
    "git switch * --guess*": deny
  task: deny
  webfetch: deny
  websearch: deny
---
Read `AGENTS.md`; take `skill-prefix` from it (no default; BLOCKED if absent).
Load `<prefix>-git-policy` with the `skill` tool and follow it.
If `AGENTS.md`, the prefix, or the skill is missing, return `BLOCKED` and list what is missing.
Answer the user in Russian.
