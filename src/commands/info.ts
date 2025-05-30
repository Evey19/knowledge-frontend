import { platform, arch, version as nodeVersion } from "os";
import { readFile } from "fs/promises";
import { join } from "path";
import chalk from "chalk";

import type { CLIContext, Command } from "../types";
import logger from "../utils/log";
import { defineCommand } from "../cli";

/**
 * 收集系统信息
 */
async function collectSystemInfo() {
  const bunVersion = process.versions.bun || "N/A";
  return {
    platform: platform(),
    arch: arch(),
    node: nodeVersion,
    bun: bunVersion,
    // 内存使用信息
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
  };
}

/**
 * 收集项目信息
 */
async function collectProjectInfo(cwd: string) {
  try {
    const packageJsonPath = join(cwd, "package.json");
    const packageContent = await readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageContent);

    return {
      name: packageJson.name || "N/A",
      version: packageJson.version || "N/A",
      type: packageJson.type || "commonjs",
      dependencies: Object.keys(packageJson.dependencies || {}).length,
      devDependencies: Object.keys(packageJson.devDependencies || {}).length,
    };
  } catch {
    return null;
  }
}

/**
 * 显示信息
 */
async function displayInfo(context: CLIContext): Promise<void> {
  logger.info("收集系统信息...");
  const [systemInfo, projectInfo] = await Promise.all([
    collectSystemInfo(),
    collectProjectInfo(context.cwd),
  ]);
  console.log("\n" + chalk.cyan("═".repeat(50)));
  console.log(chalk.cyan.bold("  📊 Bun CLI 系统信息"));
  console.log(chalk.cyan("═".repeat(50)));

  // CLI信息
  console.log(chalk.yellow("\n🔧 CLI 信息:"));
  console.log(`  名称: ${chalk.green(context.packageInfo.name)}`);
  console.log(`  版本: ${chalk.green(context.packageInfo.version)}`);
  console.log(`  描述: ${chalk.gray(context.packageInfo.description)}`);

  // 系统信息
  console.log(chalk.yellow("\n💻 系统信息:"));
  console.log(`  平台: ${chalk.green(systemInfo.platform)}`);
  console.log(`  架构: ${chalk.green(systemInfo.arch)}`);
  console.log(`  Node.js: ${chalk.green(systemInfo.node)}`);
  console.log(`  Bun: ${chalk.green(systemInfo.bun)}`);
  console.log(
    `  内存使用: ${chalk.green(systemInfo.memory.used)}MB / ${
      systemInfo.memory.total
    }MB`
  );

  // 项目信息
  if (projectInfo) {
    console.log(chalk.yellow("\n📦 当前项目:"));
    console.log(`  名称: ${chalk.green(projectInfo.name)}`);
    console.log(`  版本: ${chalk.green(projectInfo.version)}`);
    console.log(`  类型: ${chalk.green(projectInfo.type)}`);
    console.log(`  依赖数量: ${chalk.green(projectInfo.dependencies)}`);
    console.log(`  开发依赖: ${chalk.green(projectInfo.devDependencies)}`);
  } else {
    console.log(chalk.yellow("\n📦 当前项目:"));
    console.log(chalk.gray("  未检测到 package.json 文件"));
  }

  // 环境信息
  console.log(chalk.yellow("\n🌍 环境信息:"));
  console.log(`  工作目录: ${chalk.green(context.cwd)}`);
  console.log(
    `  调试模式: ${
      context.options.debug ? chalk.green("开启") : chalk.gray("关闭")
    }`
  );
  console.log(
    `  静默模式: ${
      context.options.silent ? chalk.green("开启") : chalk.gray("关闭")
    }`
  );
  console.log(chalk.cyan("\n═".repeat(50)) + "\n");
}

/**
 * 创建 info 命令
 */
export function createInfoCommand(): Command {
  return defineCommand({
    name: "info",
    description: "显示系统和项目信息",
    handler: async (context: CLIContext, args: string[]) => {
      await displayInfo(context);
      logger.success("信息显示完成");
    },
  });
}
