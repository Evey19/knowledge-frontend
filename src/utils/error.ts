import chalk from "chalk";
import logger from "./log";

export class CLIError extends Error {
  public readonly code: string;
  public readonly exitCode: number;

  constructor(message: string, code = "CLI_ERROR", exitCode = 1) {
    super(message);
    this.name = "CLIError";
    this.code = code;
    this.exitCode = exitCode;
  }
}

export class ValidationError extends CLIError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 1);
    this.name = "ValidationError";
  }
}

export class FileSystemError extends CLIError {
  constructor(message: string) {
    super(message, "FILESYSTEM_ERROR", 1);
    this.name = "FileSystemError";
  }
}

/**
 * 全局错误处理器
 */
export function setupGlobalErrorHandlers(): void {
  // 处理未捕获的异常
  process.on("uncaughtException", (error) => {
    logger.error("未捕获的异常：", error.message);
    if (process.env.NODE_ENV === "development") {
      console.error(error.stack);
    }
    process.exit(1);
  });

  // 处理未处理的Promise拒绝
  process.on("unhandledRejection", (reason, promise) => {
    logger.error("未处理的Promise拒绝：", reason);
    if (process.env.NODE_ENV === "development") {
      console.error("Promise：", promise);
    }
    process.exit(1);
  });

  // 优雅关闭处理
  process.on("SIGINT", () => {
    logger.info("\n正在优雅关闭...");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    logger.info("收到终止信号，正在关闭...");
    process.exit(0);
  });
}

/**
 * 统一错误处理函数
 */
export function handleError(error: unknown): never {
  if (error instanceof CLIError) {
    logger.error(error.message);
    if (process.env.NODE_ENV === "development") {
      console.error(error.stack);
    }
    process.exit(error.exitCode);
  }

  if (error instanceof Error) {
    logger.error(`意外错误：${error.message}`);
    if (process.env.NODE_ENV === "development") {
      console.error(error.stack);
    }
    process.exit(1);
  }

  logger.error("未知错误:", error);
  process.exit(1);
}
