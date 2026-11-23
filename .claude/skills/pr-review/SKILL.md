---
name: pr-review
description: PR 리뷰 기준. CI(.github/workflows/review.yml)는 "/pr-review <owner/repo> <PR 번호>", 작성 에이전트는 push 전에 "/pr-review local" 로 부른다.
---

# PR 리뷰

대상: `$ARGUMENTS`

CI에서는 이 파일이 PR이 아니라 main에 있는 버전으로 읽힌다. PR에서 이 파일을 고쳐도 그 PR의 리뷰 기준은 바뀌지 않는다.

## 0. 모드

- **CI 모드** (`<owner/repo> <PR 번호>`): GitHub PR을 리뷰하고 댓글을 단다. 1~6절을 모두 따른다.
- **로컬 모드** (`local`): PR을 올리기 전 작성 에이전트의 자가 리뷰. `git fetch origin main` 후 `git diff origin/main...HEAD` 와 커밋 안 된 변경(`git diff HEAD`)을 본다. GitHub에 아무것도 쓰지 않고, 5절 요약 형식으로 대화에 보고한다. 기준(2~4절)은 CI 모드와 같다.

## 1. 먼저 읽을 것

- CI 모드: `gh pr diff <번호>` 로 PR 전체 변경을 본다. 필요하면 바뀌지 않은 파일도 열어 관계를 확인한다.
- CI 모드: `.review-context/previous-inline.json` 에 이 PR에 이미 단 줄 단위 지적이 있다. 같은 내용은 다시 달지 않는다.

## 2. 확인할 것 (이 순서로)

1. **CI 약화**: `.github/workflows/` 의 검사 명령이 빠지거나 항상 통과하게 바뀜(예: `shellcheck` → `true`), 테스트 삭제·건너뛰기·단언 완화
2. **필수 검사가 깨짐**: main 룰셋은 잡 이름 `check`, `test`, `drift`, `review` 를 필수로 기다린다. 이 잡 이름이 바뀌거나 사라짐, 또는 이 잡들의 워크플로에 `on.pull_request.paths` 필터가 생김 (둘 다 모든 PR이 대기로 막힌다)
3. **배포 위험**: `deploy-*.yml` 의 트리거·`permissions` 가 넓어짐, 비밀값이 로그에 출력될 수 있음
4. **버그**: 특히 `scripts/promote.sh` 승격 규칙(main에 없는 커밋, 같은 커밋, 뒤로 가는 커밋 거절, YY.M.N 번호)
5. **구조**: 이번 변경이 만든 것만 본다
   - 같은 로직을 복사해 두 곳 이상에 둠 (한 곳을 고치면 다른 곳이 어긋남)
   - 이미 있는 함수·변수·패턴을 두고 같은 일을 새로 구현함
   - 한 함수나 블록이 서로 다른 일을 여러 개 하게 됨
   - 지적할 때는 "어디와 어디가 같은지"처럼 구체적인 위치를 댄다. 위치를 댈 수 없으면 취향이므로 쓰지 않는다

## 3. 지적하지 말 것

- 포맷, 이름 짓기, 주석, 문장 다듬기 같은 취향 문제
- 이번 PR이 바꾸지 않은 코드에 원래 있던 문제
- "~하면 더 좋을 수도" 같은 확신 없는 제안. 코드를 읽고 실제로 문제가 되는 경우만 쓴다

## 4. 심각도

- **Important**: 머지하면 안 되는 문제. 2절 1~4번에 해당하고 근거가 코드에 있음. **머지를 막는다**
- **Structure**: 2절 5번. 작성자에게 고치라고 요청하지만 머지를 막지는 않는다. 최대 3개
- **Nit**: 고치면 좋지만 요청할 정도는 아님. 최대 2개, Important나 Structure가 있으면 쓰지 않는다

## 5. 남기는 방법

- CI 모드 줄 단위 지적: `mcp__github_inline_comment__create_inline_comment` (`confirmed: true`). 제목은 `**[Important]**`, `**[Structure]**`, `**[Nit]**` 중 하나로 시작한다. 최대 5개
- CI 모드 요약 댓글은 PR에 **하나만** 둔다. 항상 이 명령으로 쓴다 (이전 요약을 덮어쓰고, 없으면 새로 만든다):
  `gh pr comment <번호> --edit-last --create-if-none --body "<요약>"`
- 요약 형식:

  ```
  ## Claude 리뷰 (커밋 <짧은 sha>)
  결과: Important N개 / Structure N개 / Nit N개   (없으면 "문제 없음")
  - [Important] 한 줄 요약 — 파일:줄
  확인한 항목: CI 약화, 필수 검사, 배포, 버그, 구조
  ```

- CI 모드에서는 GitHub 댓글로만 남기고, 답변 메시지로 리뷰를 쓰지 않는다

## 6. 최종 결과 (CI 모드)

마지막에 `important`, `structure`, `nit` 개수를 결과로 낸다. 요약 댓글에 쓴 개수와 같아야 한다.
`important` 가 1 이상이면 이 PR은 머지가 막힌다. 그러니 Important는 2절 1~4번에 해당하고 근거가 코드에 있을 때만 붙인다.
