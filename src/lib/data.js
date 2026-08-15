import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, '../../data/resources.json');
const EXAMPLE_PATH = path.resolve(__dirname, '../../data/resources.example.json');

/**
 * 读取全部收藏资源。
 * 优先读取 data/resources.json；若不存在（未初始化），回退到示例数据。
 */
export function getAllResources() {
  const file = existsSync(DATA_PATH) ? DATA_PATH : EXAMPLE_PATH;
  const raw = JSON.parse(readFileSync(file, 'utf-8'));
  return raw.resources || [];
}
