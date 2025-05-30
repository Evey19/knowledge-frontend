import chalk from "chalk";
import type { Logger } from "../types";

class CLILogger implements Logger {
  private debugMode: boolean = false;

  constructor(debugMode = false) {
    this.debugMode = debugMode;
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  info(message: string, ...args: any[]): void {
    console.log(chalk.blue("ℹ"), message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(chalk.yellow("⚠"), message, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(chalk.red("✖"), message, ...args);
  }

  success(message: string, ...args: any[]): void {
    console.log(chalk.green("✓"), message, ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (this.debugMode) {
      console.log(chalk.gray("🐛"), chalk.gray(message), ...args);
    }
  }
}

export const logger = new CLILogger();
export default logger;
