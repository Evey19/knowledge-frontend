/**
 * Create 命令 - 创建新项目
 */

import { mkdir, writeFile, access, constants } from "fs/promises";
import { join } from "path";
import chalk from "chalk";
import inquirer from "inquirer";

import type { Command, CLIContext, ProjectTemplate } from "../types";
import logger from "../utils/log";
import { CLIError, ValidationError } from "../utils/error";
import { defineCommand } from "../cli";

/**
 * 可用的项目模板
 */
const AVAILABLE_TEMPLATES: ProjectTemplate[] = [
  {
    name: "vanilla",
    description: "纯 JavaScript/TypeScript 项目",
    path: "templates/vanilla",
    dependencies: {
      typescript: "^5.0.0",
    },
    devDependencies: {
      "@types/node": "^20.0.0",
    },
  },
  {
    name: "react",
    description: "React + TypeScript 项目",
    path: "templates/react",
    dependencies: {
      react: "^18.0.0",
      "react-dom": "^18.0.0",
    },
    devDependencies: {
      "@types/react": "^18.0.0",
      "@types/react-dom": "^18.0.0",
      typescript: "^5.0.0",
    },
  },
  {
    name: "vue",
    description: "Vue 3 + TypeScript 项目",
    path: "templates/vue",
    dependencies: {
      vue: "^3.0.0",
    },
    devDependencies: {
      "@vitejs/plugin-vue": "^4.0.0",
      typescript: "^5.0.0",
    },
  },
];

/**
 * 验证项目名称
 */
function validateProjectName(name: string): boolean {
  const pattern = /^[a-z0-9-_]+$/;
  return pattern.test(name) && name.length > 0 && name.length <= 50;
}

/**
 * 检查目录是否存在
 */
async function checkDirectoryExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取项目创建选项
 */
async function getCreateOptions(
  projectName?: string,
  templateName?: string
): Promise<{ name: string; template: ProjectTemplate; force: boolean }> {
  const questions: any[] = [];

  if (!projectName) {
    questions.push({
      type: "input",
      name: "name",
      message: "请输入项目名称:",
      validate: (input: string) => {
        if (!input.trim()) return "项目名称不能为空";
        if (!validateProjectName(input.trim())) {
          return "项目名称只能包含小写字母、数字、连字符和下划线";
        }
        return true;
      },
    });
  }

  if (!templateName) {
    questions.push({
      type: "list",
      name: "template",
      message: "请选择项目模板:",
      choices: AVAILABLE_TEMPLATES.map((t) => ({
        name: `${chalk.cyan(t.name)} - ${t.description}`,
        value: t.name,
      })),
    });
  }

  let answers: any = {};
  if (questions.length > 0) {
    answers = await inquirer.prompt(questions);
  }

  const finalName = projectName || answers.name;
  const finalTemplateName = templateName || answers.template;

  const template = AVAILABLE_TEMPLATES.find(
    (t) => t.name === finalTemplateName
  );

  if (!template) {
    throw new ValidationError(`未知模板: ${finalTemplateName}`);
  }

  const targetPath = join(process.cwd(), finalName);
  const exists = await checkDirectoryExists(targetPath);

  let force = false;
  if (exists) {
    const { shouldOverwrite } = await inquirer.prompt([
      {
        type: "confirm",
        name: "shouldOverwrite",
        message: `目录 ${chalk.yellow(finalName)} 已存在，是否要覆盖？`,
        default: false,
      },
    ]);
    force = shouldOverwrite;
  }

  return {
    name: finalName,
    template,
    force,
  };
}

/**
 * 创建项目文件
 */
async function createProjectFiles(
  projectPath: string,
  template: ProjectTemplate,
  projectName: string
): Promise<void> {
  const packageJson = {
    name: projectName,
    version: "0.1.0",
    description: `A ${template.name} project created with Bun CLI`,
    type: "module",
    scripts: {
      dev: "bun run --watch src/index.ts",
      build: "bun build src/index.ts --outdir dist",
      start: "bun run dist/index.js",
    },
    dependencies: template.dependencies || {},
    devDependencies: template.devDependencies || {},
  };

  await writeFile(
    join(projectPath, "package.json"),
    JSON.stringify(packageJson, null, 2),
    "utf-8"
  );

  const srcDir = join(projectPath, "src");
  await mkdir(srcDir, { recursive: true });

  let indexContent = "";
  switch (template.name) {
    case "react":
      indexContent = `import React from 'react';
        import ReactDOM from 'react-dom/client';
        
        function App() {
          return (
            <div>
              <h1>Hello, React!</h1>
              <p>Welcome to your new ${template.name} project!</p>
            </div>
          );
        }
        
        const root = ReactDOM.createRoot(document.getElementById('root')!);
        root.render(<App />);
        `;
      break;
    case "vue":
      indexContent = `import { createApp } from 'vue';

const App = {
  template: \`
    <div>
      <h1>Hello, Vue!</h1>
      <p>Welcome to your new {{ templateName }} project!</p>
    </div>
  \`,
  data() {
    return {
      templateName: '${template.name}'
    };
  }
};

createApp(App).mount('#app');
`;
      break;
    default:
      indexContent = `console.log('Hello, ${template.name}!');
  console.log('Welcome to your new ${template.name} project!');
  
  // Your awesome code starts here...
  export default function main() {
    console.log('Project initialized successfully!');
  }
  
  if (import.meta.main) {
    main();
  }
  `;
  }
  await writeFile(join(srcDir, "index.ts"), indexContent, "utf-8");
  const readmeContent = `# ${projectName}
  A ${template.description} created with Bun CLI.

## 开始使用

\`\`\`bash
# 安装依赖
bun install

# 开发模式
bun run dev

# 构建项目
bun run build

# 运行构建后的项目
bun run start
\`\`\`

## 项目结构

\`\`\`
${projectName}/
├── src/
│   └── index.ts          # 入口文件
├── package.json          # 项目配置
└── README.md            # 项目说明
\`\`\`

Happy coding! 🚀
`;
  await writeFile(join(projectPath, "README.md"), readmeContent, "utf-8");
}

/**
 * 创建项目
 */
async function createProject(
  context: CLIContext,
  projectName?: string,
  options: any = {}
): Promise<void> {
  try {
    logger.info("开始创建项目...");
    const createOptions = await getCreateOptions(projectName, options.template);
    const projectPath = join(context.cwd, createOptions.name);
    if (createOptions.force || !(await checkDirectoryExists(projectPath))) {
      await mkdir(projectPath, { recursive: true });
      logger.debug(`创建目录: ${projectPath}`);
    } else {
      throw new CLIError("项目目录已存在，使用 --force 强制覆盖");
    }

    await createProjectFiles(
      projectPath,
      createOptions.template,
      createOptions.name
    );

    logger.success(`项目 ${chalk.green(createOptions.name)} 创建成功！`);

    console.log(`\n${chalk.yellow("下一步:")}`);
    console.log(`  ${chalk.cyan(`cd ${createOptions.name}`)}`);
    console.log(`  ${chalk.cyan("bun install")}`);
    console.log(`  ${chalk.cyan("bun run dev")}`);
    console.log("");
  } catch (error) {
    if (error instanceof Error) {
      throw new CLIError(`项目创建失败: ${error.message}`);
    }
    throw error;
  }
}

/**
 * 创建 create 命令
 */
export function createCreateCommand(): Command {
  return defineCommand({
    name: "create",
    description: "创建新项目",
    options: {
      "-t, --template <name>": "指定项目模板 (vanilla|react|vue)",
      "-f, --force": "强制覆盖已存在的目录",
      "--no-install": "跳过依赖安装",
    },
    handler: async (context: CLIContext, args: string[]) => {
      const projectName = args[0];
      const options = context.options;

      await createProject(context, projectName, options);
    },
  });
}
