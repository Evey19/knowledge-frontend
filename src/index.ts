#!/usr/bin/env bun
/**
 * Knowledge Frontend CLI - 主入口文件
 *
 * 这是一个高质量的脚手架CLI工具，注重以下特性：
 * - 维护性：清晰的模块结构和错误处理
 * - 可读性：完整的类型定义和注释
 * - 扩展性：插件化的命令系统
 * - 性能：异步操作和资源优化
 *
 * @author Knowledge Team
 * @version 0.0.1
 */

import { performance } from "perf_hooks";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFile } from "fs/promises";
import chalk from "chalk";
import figlet from "figlet";

import { setupGlobalErrorHandlers, handleError, CLIError } from "./utils/error";
import logger from "./utils/log";
import type { CLIContext, CLIOptions } from "./types";

// 获取当前文件和包信息
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, "../package.json");

/**
 * 初始化CLI应用
 */
