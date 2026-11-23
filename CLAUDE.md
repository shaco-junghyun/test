# 리뷰 루프 (작성 에이전트)

main은 PR로만 바뀌고, PR마다 Claude 리뷰(`review`, 필수 검사)가 돈다. 기준은 `.claude/skills/pr-review/SKILL.md` 하나다.

1. **push 전 자가 리뷰**: PR을 열거나 push하기 전에 `/pr-review local` 을 돌리고 Important·Structure를 고친다. 다시 돌려서 확인한다. 2번 돌려도 남으면 고치지 말고 PR 설명에 남은 지적과 이유를 적는다.
2. **CI 리뷰 지적은 의견이다**: claude[bot]의 지적이 맞으면 고치고 push한 뒤 그 스레드에 무엇을 바꿨는지 답하고 닫는다. 틀렸다고 판단하면 고치지 말고 근거를 답한다.
3. **멈출 때**: CI 리뷰 지적을 받아 고친 push가 2번을 넘거나, 리뷰와 의견이 갈려 Important가 남으면 더 고치지 말고 사용자에게 넘긴다. Important로 막힌 PR의 머지는 관리자 우회로 사람이 판단한다.
