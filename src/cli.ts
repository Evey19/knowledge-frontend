/**
 * CLI 命令解析器
 *
 * 基于Commander.js构建的高度可扩展的命令系统
 * - 支持插件化命令注册
 * - 提供统一的错误处理
 * - 支持命令自动发现
 * - 内置帮助和版本信息
 */

import { Command } from "commander";
import chalk from "chalk";
import figlet from "figlet";
import { readdir, stat } from "fs/promises";
import { join, extname, dirname } from "path";
import { fileURLToPath } from "url";

import type { CLIContext, Command as CLICommand } from "./types";
import { CLIError, handleError } from "./utils/error";
import logger from "./utils/log";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * CLI应用类
 * 管理整个CLI应用的生命周期
 */
export class CLIApplication {
  private program: Command;
  private context: CLIContext;
  private commands: Map<string, CLICommand> = new Map();

  constructor(context: CLIContext) {
    this.context = context;
    this.program = new Command();
    this.setupProgram();
  }

  /**
   * 设置主程序配置
   */
  private setupProgram(): void {
    const { packageInfo } = this.context;
    this.program
      .name(packageInfo.name)
      .description(packageInfo.description)
      .version(packageInfo.version, "-v, --version", "显示版本信息")
      .helpOption("-h, --help", "显示帮助信息")
      .configureHelp({
        sortSubcommands: true,
        subcommandTerm: (cmd) => chalk.cyan(cmd.name()),
        argumentTerm: (arg) => chalk.yellow(arg.name()),
        optionTerm: (option) => chalk.green(option.flags),
      });

    // 添加全局选项
    this.addGlobalOptions();

    // 设置错误处理
    this.setupErrorHandling();

    // 设置自定义帮助
    this.setupCustomHelp();
  }

  /**
   * 添加全局选项
   */
  private addGlobalOptions(): void {
    this.program
      .option("-d, --debug", "启用调试模式", false)
      .option("-s, --silent", "静默模式", false)
      .option("-c, --config <path>", "指定配置文件路径")
      .option("--cwd <path>", "指定工作目录", process.cwd())
      .option("--no-color", "禁用颜色输出");

    this.program.hook("preAction", (thisCommand) => {
      const opts = thisCommand.opts();

      Object.assign(this.context.options, opts);

      // 设置调试模式
      if (opts.debug) {
        logger.setDebugMode(true);
        logger.debug("调试模式已启用");
      }

      // 设置工作目录
      if (opts.cwd && opts.cwd !== process.cwd()) {
        try {
          process.chdir(opts.cwd);
          this.context.cwd = opts.cwd;
          logger.debug(`工作目录已切换到: ${opts.cwd}`);
        } catch (error) {
          throw new CLIError(`无法切换到目录: ${opts.cwd}`);
        }
      }
    });
  }

  /**
   * 设置错误处理
   */
  private setupErrorHandling(): void {
    this.program.exitOverride((err) => {
      if (err.code === "commander.help") {
        process.exit(0);
      }
      if (err.code === "commander.version") {
        process.exit(0);
      }
      if (err.code === "commander.unknownCommand") {
        logger.error(`未知命令: ${err.message}`);
        logger.info("使用 --help 查看可用命令");
        process.exit(1);
      }
      throw new CLIError(err.message, "COMMANDER_ERROR");
    });
  }

  /**
   * 设置自定义帮助
   */
  private setupCustomHelp(): void {
    this.program.addHelpText("beforeAll", () => {
      return (
        chalk.cyan(
          figlet.textSync("Bun CLI", {
            font: "Small",
            horizontalLayout: "fitted",
          })
        ) + "\n"
      );
    });

    this.program.addHelpText("after", () => {
      return `
  ${chalk.gray("示例:")}
    ${chalk.cyan("bun-cli create my-app")}     创建新项目
    ${chalk.cyan("bun-cli dev")}              启动开发服务器
    ${chalk.cyan("bun-cli build")}            构建生产版本
    ${chalk.cyan("bun-cli --help")}           显示帮助信息
  
  ${chalk.gray("更多信息:")}
    文档: ${chalk.underline("https://bun-cli.dev")}
    问题: ${chalk.underline("https://github.com/bun/cli/issues")}
        `;
    });
  }

  /**
   * 注册命令
   */
  public registerCommand(command: CLICommand): void {
    if (this.commands.has(command.name)) {
      throw new CLIError(`命令 '${command.name}' 已存在`);
    }
    this.commands.set(command.name, command);
    const cmd = this.program
      .command(command.name)
      .description(command.description);

    if (command.options) {
      Object.entries(command.options).forEach(([flag, description]) => {
        cmd.option(flag, description);
      });
    }

    cmd.action(async (...args) => {
      try {
        const cmdArgs = args.slice(0, -1);
        const options = args[args.length - 1].opts();

        logger.debug(`执行命令: ${command.name}`, { args: cmdArgs, options });
        await command.handler(this.context, cmdArgs);
      } catch (error) {
        handleError(error);
      }
    });
  }

  /**
   * 自动发现并加载命令
   */
  public async autoDiscoverCommands(): Promise<void> {
    const commandsDir = join(__dirname, "commands");

    try {
      const files = await readdir(commandsDir);
      for (const file of files) {
        if (file === "index.ts" || file === "index.js") continue;
        const filePath = join(commandsDir, file);
        const fileStat = await stat(filePath);
        if (
          fileStat.isFile() &&
          (extname(file) === ".ts" || extname(file) === ".js")
        ) {
          try {
            const commandModule = await import(filePath);
            const command = commandModule.default || commandModule;
            if (this.isValidCommand(command)) {
              this.registerCommand(command);
              logger.debug(`已加载命令: ${command.name}`);
            } else {
              logger.warn(`跳过无效命令文件: ${file}`);
            }
          } catch (error) {
            logger.warn(`加载命令失败: ${file}`, error);
          }
        }
      }
    } catch (error) {
      logger.debug("Commands目录不存在，注册基础命令");
      await this.registerDefaultCommands();
    }
  }

  /**
   * 验证命令对象是否有效
   */
  private isValidCommand(command: any): command is CLICommand {
    return (
      command &&
      typeof command === "object" &&
      typeof command.name === "string" &&
      typeof command.description === "string" &&
      typeof command.handler === "function"
    );
  }

  /**
   * 注册默认命令
   */
  private async registerDefaultCommands(): Promise<void> {
    this.registerCommand({
      name: "info",
      description: "显示系统信息",
      handler: async (context) => {
        const { createInfoCommand } = await import("./commands/info");
        const infoCommand = createInfoCommand();
        await infoCommand.handler(context, []);
      },
    });
    this.registerCommand({
      name: "create",
      description: "创建新项目",
      options: {
        "-t, --template <name>": "指定项目模板",
        "-f, --force": "强制覆盖已存在的目录",
        "--no-install": "跳过依赖安装",
      },
      handler: async (context, args) => {
        const { createCreateCommand } = await import("./commands/create");
        const createCommand = createCreateCommand();
        await createCommand.handler(context, args);
      },
    });
  }

  /**
   * 获取所有已注册的命令
   */
  public getCommands(): CLICommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * 获取程序实例
   */
  public getProgram(): Command {
    return this.program;
  }

  /**
   * 解析命令行参数
   */
  public async parseAsync(argv: string[]): Promise<void> {
    try {
      await this.program.parseAsync(argv);
    } catch (error) {
      handleError(error);
    }
  }
}

/**
 * 创建CLI应用实例
 */
export async function createCLI(context: CLIContext): Promise<CLIApplication> {
  const cli = new CLIApplication(context);
  await cli.autoDiscoverCommands();
  return cli;
}

/**
 * 命令构建器工具类
 * 提供流畅的API来构建命令
 */
export class CommandBuilder {
  private command: Partial<CLICommand> = {};

  static create(name: string): CommandBuilder {
    const builder = new CommandBuilder();
    builder.command.name = name;
    return builder;
  }

  description(desc: string): CommandBuilder {
    this.command.description = desc;
    return this;
  }

  option(flag: string, description: string): CommandBuilder {
    if (!this.command.options) {
      this.command.options = {};
    }
    this.command.options[flag] = description;
    return this;
  }

  action(handler: CLICommand["handler"]): CommandBuilder {
    this.command.handler = handler;
    return this;
  }

  build(): CLICommand {
    if (
      !this.command.name ||
      !this.command.description ||
      !this.command.handler
    ) {
      throw new CLIError("命令构建不完整，缺少必要属性");
    }
    return this.command as CLICommand;
  }
}

export function defineCommand(config: CLICommand): CLICommand {
  return config;
}
