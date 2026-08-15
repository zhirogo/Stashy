import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, rm } from 'node:fs/promises';
import path from 'node:path';

const exec = promisify(execFile);

// Windows 下经命令行传中文参数会按 GBK 编码导致乱码，
// 因此统一用临时 UTF-8 文件 + `git commit -F` 的方式提交。
const MSG_FILE = path.resolve(process.cwd(), '.git/COMMIT_MSG_TMP');

/** 执行 git 命令，返回 stdout 文本 */
async function runGit(args) {
  const { stdout } = await exec('git', args, {
    cwd: process.cwd(),
    encoding: 'utf-8',
  });
  return stdout.trim();
}

/** 获取当前 git 仓库状态摘要 */
export async function getStatus() {
  try {
    const branch = await runGit(['branch', '--show-current']);
    const dirty = (await runGit(['status', '--porcelain'])).length > 0;
    const remote = await runGit(['remote', '-v']);
    const hasRemote = remote.length > 0;
    return { ok: true, isRepo: true, branch, dirty, hasRemote };
  } catch {
    return { ok: false, isRepo: false, message: '当前目录不是有效的 git 仓库' };
  }
}

/**
 * 一键发布：提交 data/ 与站点相关变更并推送到远程（若配置了远程）。
 * @param {string} message 提交信息
 */
export async function publish(message) {
  // 1. 检查变更
  const changed = (await runGit(['status', '--porcelain'])) || '';
  if (!changed) {
    return { ok: true, pushed: false, detail: '没有检测到变更，无需发布' };
  }

  // 2. 写入 UTF-8 提交信息文件，规避 Windows 命令行编码问题
  const safeMessage = (message || 'chore(data): 更新收藏').trim();
  await writeFile(MSG_FILE, safeMessage + '\n', 'utf-8');

  // 3. 暂存并提交
  await runGit(['add', '-A']);
  await runGit(['commit', '-F', MSG_FILE]);
  await rm(MSG_FILE, { force: true });

  // 4. 若配置了远程则推送
  let pushed = false;
  try {
    const remote = await runGit(['remote']);
    if (remote) {
      await runGit(['push']);
      pushed = true;
    }
  } catch {
    pushed = false;
  }

  return {
    ok: true,
    pushed,
    detail: pushed ? '已提交并推送到远程仓库' : '已提交到本地（未配置远程，未推送）',
  };
}
