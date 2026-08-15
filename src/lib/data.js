import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, '../../data/resources.json');
const EXAMPLE_PATH = path.resolve(__dirname, '../../data/resources.example.json');

/** 当前数据是否来自示例文件（即 data/resources.json 尚未初始化） */
export const isUsingExampleData = !existsSync(DATA_PATH);

/** 实际加载的数据文件路径 */
export const dataFilePath = isUsingExampleData ? EXAMPLE_PATH : DATA_PATH;

/**
 * 读取全部收藏资源。
 * 优先读取 data/resources.json；若不存在（未初始化），回退到示例数据。
 */
export function getAllResources() {
  const raw = JSON.parse(readFileSync(dataFilePath, 'utf-8'));
  return raw.resources || [];
}
