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
async function initializeCLI(): Promise<CLIContext> {
  const startTime = performance.now();
  try {
    const packageContent = await readFile(packageJsonPath, "utf-8");
    const packageInfo = JSON.parse(packageContent);

    await displayWelcomeMessage(packageInfo.name, packageInfo.version);

    // 创建CLI上下文
    const context: CLIContext = {
      options: parseGlobalOptions(),
      cwd: process.cwd(),
      packageInfo: {
        name: packageInfo.name,
        version: packageInfo.version,
        description: packageInfo.description,
      },
    };

    if (context.options.debug) {
      logger.setDebugMode(true);
      logger.debug("调试模式已启用");
    }

    const initTime = performance.now() - startTime;
    logger.debug(`CLI初始化完成，耗时: ${initTime.toFixed(2)}ms`);

    return context;
  } catch (error) {
    throw new CLIError(
      `CLI初始化失败: ${
        error instanceof Error ? error.message : String(error)
      }`,
      "INIT_ERROR"
    );
  }
}

async function displayWelcomeMessage(
  name: string,
  version: string
): Promise<void> {
  return new Promise((resolve) => {
    figlet.text(
      "Bun CLI",
      {
        font: "Standard",
        horizontalLayout: "default",
        verticalLayout: "default",
      },
      (err, data) => {
        if (!err && data) {
          console.log(chalk.cyan(data));
        }
        console.log(chalk.gray(`${name} v${version}`));
        console.log(chalk.gray("构建现代前端项目的强大脚手架工具\n"));
        resolve();
      }
    );
  });
}

/**
 * 解析全局选项
 */
function parseGlobalOptions(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};
  if (args.includes("--debug") || args.includes("-d")) {
    options.debug = true;
  }
  if (args.includes("--silent") || args.includes("-s")) {
    options.silent = true;
  }
  const configIndex = args.findIndex(
    (arg) => arg === "--config" || arg === "-c"
  );
  if (configIndex !== -1 && args[configIndex + 1]) {
    options.config = args[configIndex + 1];
  }
  return options;
}

/**
 * 主入口函数
 */
async function main(): Promise<void> {
  const startTime = performance.now();
  try {
    setupGlobalErrorHandlers();
    const context = await initializeCLI();

    // 动态导入CLI模块（避免循环依赖）
    const { createCLI } = await import("./cli");
    const cli = await createCLI(context);
    await cli.parseAsync(process.argv);

    const totalTime = performance.now() - startTime;
    logger.debug(`总执行时间: ${totalTime.toFixed(2)}ms`);
  } catch (error) {
    handleError(error);
  }
}

/**
 * 性能监控装饰器
 */
export function withPerformanceMonitoring<
  T extends (...args: any[]) => Promise<any>
>(fn: T, name: string): T {
  return (async (...args: any[]) => {
    const startTime = performance.now();
    try {
      const result = await fn(...args);
      const endTime = performance.now();
      logger.debug(`${name} 执行时间: ${(endTime - startTime).toFixed(2)}ms`);
      return result;
    } catch (error) {
      const endTime = performance.now();
      logger.debug(
        `${name} 执行失败，耗时: ${(endTime - startTime).toFixed(2)}ms`
      );
      throw error;
    }
  }) as T;
}

// 确保 main 函数只在当前文件被直接运行时才执行，而不是当它被其他模块导入时执行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(handleError);
}

// 导出供测试使用的函数
export { initializeCLI, parseGlobalOptions, displayWelcomeMessage };
