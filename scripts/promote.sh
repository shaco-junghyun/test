#!/usr/bin/env bash
# 운영 승격: main의 한 커밋을 골라 다음 버전(YY.M.N) 릴리즈를 만든다.
# 릴리즈가 게시되면 .github/workflows/deploy-production.yml 이 운영 배포를 한다.
#
# 사용법: bun run promote <sha> [--yes|--dry-run]
#   --dry-run: 검증하고 다음 번호와 요약만 보여 준 뒤 릴리즈를 만들지 않는다.
set -euo pipefail

sha_arg="${1:-}"
option="${2:-}"
if [[ -z "$sha_arg" ]]; then
  echo "사용법: bun run promote <sha> [--yes|--dry-run]" >&2
  exit 1
fi

git fetch --quiet --tags origin main

sha=$(git rev-parse --verify --quiet "${sha_arg}^{commit}") || {
  echo "커밋을 찾을 수 없습니다: $sha_arg" >&2
  exit 1
}

# 1. main에 있는 커밋만 승격한다.
if ! git merge-base --is-ancestor "$sha" origin/main; then
  echo "main에 없는 커밋입니다: $sha_arg" >&2
  exit 1
fi

# 2. 지난 승격보다 앞으로만 간다.
last_tag=$(git tag --list '[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname | head -1)
if [[ -n "$last_tag" ]]; then
  last_sha=$(git rev-list -n 1 "$last_tag")
  if [[ "$sha" == "$last_sha" ]]; then
    echo "이미 $last_tag 로 운영에 나간 커밋입니다." >&2
    exit 1
  fi
  if ! git merge-base --is-ancestor "$last_sha" "$sha"; then
    echo "지난 승격($last_tag)보다 뒤에 있는 커밋만 승격할 수 있습니다." >&2
    exit 1
  fi
fi

# 3. 다음 번호: 이번 달(한국 시간) 마지막 N + 1
yy=$(TZ=Asia/Seoul date +%y)
mm=$((10#$(TZ=Asia/Seoul date +%m)))
prefix="$yy.$mm"
last_n=$(git tag --list "$prefix.*" | sed -nE "s/^$yy\.$mm\.([0-9]+)$/\1/p" | sort -n | tail -1)
tag="$prefix.$(( ${last_n:-0} + 1 ))"

echo "새 릴리즈: $tag"
echo "커밋:      $(git log -1 --format='%h %s' "$sha")"
if [[ -n "$last_tag" ]]; then
  echo "지난 릴리즈 $last_tag 이후 나갈 커밋:"
  git log --format='  %h %s' "$last_tag..$sha"
fi

if [[ "$option" == "--dry-run" ]]; then
  echo "--dry-run: 릴리즈를 만들지 않았습니다."
  exit 0
fi

if [[ "$option" != "--yes" ]]; then
  read -r -p "운영에 배포할까요? [y/N] " answer
  [[ "$answer" == "y" || "$answer" == "Y" ]] || { echo "취소했습니다."; exit 1; }
fi

gh release create "$tag" --target "$sha" --title "$tag" --generate-notes
echo "운영 배포 워크플로가 시작됩니다: gh run list --workflow deploy-production.yml"
