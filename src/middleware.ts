import { defineMiddleware } from 'astro:middleware';
import { getAllResources } from './lib/data.js';

// 将资源数据注入到所有页面，供布局与页面读取
export const onRequest = defineMiddleware((context, next) => {
  context.locals.resources = getAllResources();
  return next();
});
