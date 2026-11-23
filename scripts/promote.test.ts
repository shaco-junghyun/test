// scripts/promote.sh 를 임시 git 레포에서 실제로 실행해 승격 규칙을 확인한다.
// gh 는 가짜로 바꿔서 호출 인자만 기록한다 (진짜 릴리즈를 만들지 않는다).
import { afterEach, beforeEach, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const script = join(import.meta.dir, "promote.sh");

let root: string;
let work: string;
let ghLog: string;
let env: Record<string, string>;

function run(cmd: string[], cwd = work) {
  const p = Bun.spawnSync(cmd, { cwd, env });
  return { code: p.exitCode, out: p.stdout.toString() + p.stderr.toString() };
}

function git(...args: string[]) {
  const r = run(["git", ...args]);
  if (r.code !== 0) throw new Error(`git ${args.join(" ")}\n${r.out}`);
  return r.out.trim();
}

function commit(msg: string) {
  writeFileSync(join(work, "file.txt"), msg);
  git("add", "file.txt");
  git("commit", "-q", "-m", msg);
  return git("rev-parse", "HEAD");
}

function promote(sha: string, flag = "--yes") {
  return run(["bash", script, sha, flag]);
}

// promote.sh 와 같은 방식으로 이번 달(한국 시간) 접두어를 만든다. 예: 26.11
function monthPrefix() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", year: "2-digit", month: "numeric" }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}.${get("month")}`;
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "promote-test-"));
  work = join(root, "work");
  ghLog = join(root, "gh.log");

  const bin = join(root, "bin");
  mkdirSync(bin);
  writeFileSync(join(bin, "gh"), `#!/usr/bin/env bash\necho "$@" >> "${ghLog}"\n`);
  chmodSync(join(bin, "gh"), 0o755);

  env = {
    PATH: `${bin}:${process.env.PATH}`,
    HOME: root,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "test",
    GIT_AUTHOR_EMAIL: "test@example.com",
    GIT_COMMITTER_NAME: "test",
    GIT_COMMITTER_EMAIL: "test@example.com",
  };

  run(["git", "init", "-q", "--bare", "-b", "main", join(root, "origin.git")], root);
  run(["git", "init", "-q", "-b", "main", work], root);
  git("remote", "add", "origin", join(root, "origin.git"));
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

test("첫 승격은 이번 달 .1 릴리즈를 만든다", () => {
  const sha = commit("first");
  git("push", "-q", "origin", "main");

  const r = promote(sha);

  expect(r.code).toBe(0);
  expect(readFileSync(ghLog, "utf8").trim()).toBe(`release create ${monthPrefix()}.1 --target ${sha} --title ${monthPrefix()}.1 --generate-notes`);
});

test("이번 달 마지막 번호 다음 번호를 쓴다", () => {
  const a = commit("a");
  git("tag", `${monthPrefix()}.2`, a);
  const b = commit("b");
  git("push", "-q", "--tags", "origin", "main");

  const r = promote(b);

  expect(r.code).toBe(0);
  expect(readFileSync(ghLog, "utf8")).toContain(`release create ${monthPrefix()}.3 --target ${b}`);
});

test("main에 없는 커밋은 거절한다", () => {
  commit("base");
  git("push", "-q", "origin", "main");
  git("switch", "-q", "-c", "feature");
  const sha = commit("feature only");

  const r = promote(sha);

  expect(r.code).toBe(1);
  expect(r.out).toContain("main에 없는 커밋");
  expect(existsSync(ghLog)).toBe(false);
});

test("지난 릴리즈와 같은 커밋은 거절한다", () => {
  const sha = commit("released");
  git("tag", `${monthPrefix()}.1`, sha);
  git("push", "-q", "--tags", "origin", "main");

  const r = promote(sha);

  expect(r.code).toBe(1);
  expect(r.out).toContain("이미");
  expect(existsSync(ghLog)).toBe(false);
});

test("지난 릴리즈보다 뒤로 가는 커밋은 거절한다", () => {
  const older = commit("older");
  const newer = commit("newer");
  git("tag", `${monthPrefix()}.1`, newer);
  git("push", "-q", "--tags", "origin", "main");

  const r = promote(older);

  expect(r.code).toBe(1);
  expect(r.out).toContain("지난 승격");
  expect(existsSync(ghLog)).toBe(false);
});

test("--dry-run은 다음 번호를 보여 주고 릴리즈를 만들지 않는다", () => {
  const sha = commit("first");
  git("push", "-q", "origin", "main");

  const r = promote(sha, "--dry-run");

  expect(r.code).toBe(0);
  expect(r.out).toContain(`새 릴리즈: ${monthPrefix()}.1`);
  expect(existsSync(ghLog)).toBe(false);
});
