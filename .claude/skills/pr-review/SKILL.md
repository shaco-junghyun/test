---
name: pr-review
description: PR 자동 리뷰 기준. .github/workflows/review.yml 이 "/pr-review <owner/repo> <PR 번호>" 로 부른다.
---

# PR 리뷰

대상: `$ARGUMENTS` (저장소, PR 번호 순서)

이 파일은 PR이 아니라 main에 있는 버전으로 읽힌다. PR에서 이 파일을 고쳐도 그 PR의 리뷰 기준은 바뀌지 않는다.

## 1. 먼저 읽을 것

- `gh pr diff <번호>` 로 PR 전체 변경을 본다. 필요하면 바뀌지 않은 파일도 열어 관계를 확인한다.
- `.review-context/previous-inline.json` 에 이 PR에 이미 단 줄 단위 지적이 있다. 같은 내용은 다시 달지 않는다.

## 2. 확인할 것 (이 순서로)

1. **CI 약화**: `.github/workflows/` 의 검사 명령이 빠지거나 항상 통과하게 바뀜(예: `shellcheck` → `true`), 테스트 삭제·건너뛰기·단언 완화
2. **필수 검사가 깨짐**: main 룰셋은 잡 이름 `check`, `test`, `drift` 를 필수로 기다린다. 이 잡 이름이 바뀌거나 사라짐, 또는 이 잡들의 워크플로에 `on.pull_request.paths` 필터가 생김 (둘 다 모든 PR이 대기로 막힌다)
3. **배포 위험**: `deploy-*.yml` 의 트리거·`permissions` 가 넓어짐, 비밀값이 로그에 출력될 수 있음
4. **버그**: 특히 `scripts/promote.sh` 승격 규칙(main에 없는 커밋, 같은 커밋, 뒤로 가는 커밋 거절, YY.M.N 번호)

## 3. 지적하지 말 것

- 포맷, 이름 짓기, 주석, 문장 다듬기 같은 취향 문제
- 이번 PR이 바꾸지 않은 코드에 원래 있던 문제
- "~하면 더 좋을 수도" 같은 확신 없는 제안. 코드를 읽고 실제로 문제가 되는 경우만 쓴다

## 4. 심각도

- **Important**: 머지하면 안 되는 문제. 위 1~4번에 해당하고 근거가 코드에 있음
- **Nit**: 고치면 좋지만 머지를 막을 정도는 아님. **최대 2개**, Important가 있으면 Nit은 쓰지 않는다

## 5. 남기는 방법

- 줄 단위 지적: `mcp__github_inline_comment__create_inline_comment` (`confirmed: true`). 제목은 `**[Important]**` 또는 `**[Nit]**` 로 시작한다. 최대 5개
- 요약 댓글은 PR에 **하나만** 둔다. 항상 이 명령으로 쓴다 (이전 요약을 덮어쓰고, 없으면 새로 만든다):
  `gh pr comment <번호> --edit-last --create-if-none --body "<요약>"`
- 요약 형식:

  ```
  ## Claude 리뷰 (커밋 <짧은 sha>)
  결과: Important N개 / Nit N개   (없으면 "문제 없음")
  - [Important] 한 줄 요약 — 파일:줄
  확인한 항목: CI 약화, 필수 검사, 배포, 버그
  ```

- GitHub 댓글로만 남기고, 답변 메시지로 리뷰를 쓰지 않는다
