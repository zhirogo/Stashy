import { readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, '../../data/resources.json');
const TMP_PATH = path.resolve(__dirname, '../../data/resources.json.tmp');

/** 读取全部收藏数据 */
export async function loadResources() {
  const raw = await readFile(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

/**
 * 原子写入数据：先写临时文件再替换，避免并发/中断导致数据损坏。
 * @param {object} data 完整数据对象 { resources: [] }
 */
export async function saveResources(data) {
  const json = JSON.stringify(data, null, 2) + '\n';
  await writeFile(TMP_PATH, json, 'utf-8');
  await rename(TMP_PATH, DATA_PATH);
}

/** 生成唯一 ID（时间戳 + 随机） */
export function genId() {
  return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** 获取当前 ISO 日期（YYYY-MM-DD） */
export function today() {
  return new Date().toISOString().slice(0, 10);
}
