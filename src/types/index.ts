export interface CLIOptions {
  /** 是否启用调试模式 */
  debug?: boolean;
  /** 是否静默模式 */
  silent?: boolean;
  /** 工作目录 */
  cwd?: string;
  /** 配置文件路径 */
  config?: string;
}

export interface CommandOptions extends CLIOptions {
  /** 命令名称 */
  name: string;
  /** 命令参数 */
  args: string[];
}

export interface ProjectTemplate {
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description: string;
  /** 模板路径 */
  path: string;
  /** 依赖配置 */
  dependencies?: Record<string, string>;
  /** 开发依赖 */
  devDependencies?: Record<string, string>;
}

export interface CLIContext {
  /** CLI选项 */
  options: CLIOptions;
  /** 当前工作目录 */
  cwd: string;
  /** 包信息 */
  packageInfo: {
    name: string;
    version: string;
    description: string;
  };
}

export interface Logger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  success(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

export type CommandHandler = (
  context: CLIContext,
  args: string[]
) => Promise<void>;

export interface Command {
  name: string;
  description: string;
  options?: Record<string, any>;
  handler: CommandHandler;
}
