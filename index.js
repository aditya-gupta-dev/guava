#!/usr/bin/env node

import fs from 'fs/promises';
import fsNormal from "fs";
import path from 'path';
import { execSync } from 'child_process';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const themes = [
  { name: 'zinc (default)', value: 'zinc' },
  { name: 'slate', value: 'slate' },
  { name: 'stone', value: 'stone' },
  { name: 'gray', value: 'gray' },
  { name: 'neutral', value: 'neutral' },
  { name: 'red', value: 'red' },
  { name: 'rose', value: 'rose' },
  { name: 'orange', value: 'orange' },
  { name: 'green', value: 'green' },
  { name: 'blue', value: 'blue' },
  { name: 'yellow', value: 'yellow' },
  { name: 'violet', value: 'violet' },
];

const drizzleProviders = [
  { name: 'PostgreSQL', value: 'postgres' },
  { name: 'MySQL', value: 'mysql' },
  { name: 'SQLite', value: 'sqlite' },
];

async function main() {
  console.log(chalk.green(`
  ╭─────────────────────────────────────────╮
  │                                         │
  │   Welcome to the Guava Stack 🥭         │
  │                                         │
  │   Crafted with love and passion         │
  │      - By github@aditya-gupta-dev       |
  │                                         │
  ╰─────────────────────────────────────────╯
  `));

  const { projectName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'What is your project named?',
      default: 'my-guava-app',
    },
  ]);

  const projectPath = path.resolve(process.cwd(), projectName);
  // check whether project actually exists 
  try {
    const res = fsNormal.existsSync(projectName)
    if(!res) {
      console.log(chalk.green(`Creating project directory: ${chalk.cyan(projectPath)}`));
      await fs.mkdir(projectPath, { recursive: true });
    }
  } catch (error) {
    console.error(chalk.red('Error checking project directory:', error));
    process.exit(1);
  }

  const { proceed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'proceed',
      message: `This will create a new Guava Stack project in ${chalk.cyan(projectPath)}. Continue?`,
      default: true,
    },
  ]);

  if (!proceed) {
    console.log(chalk.yellow('Installation cancelled.'));
    process.exit(0);
  }

  const { theme } = await inquirer.prompt([
    {
      type: 'list',
      name: 'theme',
      message: 'Choose a shadcn/ui theme:',
      choices: themes,
      default: 'zinc',
    },
  ]);

  const { useDrizzle } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'useDrizzle',
      message: 'Setup Drizzle ORM?',
      default: true,
    },
  ]);

  let drizzleProvider = null;
  if (useDrizzle) {
    const drizzlePrompt = await inquirer.prompt([
      {
        type: 'list',
        name: 'provider',
        message: 'Select a database provider:',
        choices: drizzleProviders,
      },
    ]);
    drizzleProvider = drizzlePrompt.provider;
  }

  const { useDarkMode } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'useDarkMode',
      message: 'Setup dark mode?',
      default: true,
    },
  ]);

  console.log('\n');
  const spinner = ora('Creating Next.js project...').start();
  
  try {
    const res = execSync(`npx create-next-app@latest ${projectName} --turbopack --typescript --eslint --tailwind --app --src-dir --import-alias "@/*"`, { stdio: 'pipe' });
    console.log(res.toString())
    spinner.succeed('Next.js project created');
  } catch (error) {
    spinner.fail('Failed to create Next.js project');
    console.error(chalk.red(error));
    process.exit(1);
  }

  // Change to project directory
  process.chdir(projectPath);

  // Setup shadcn/ui
  spinner.text = 'Setting up shadcn/ui...';
  spinner.start();
  
  try {
    execSync('npx shadcn-ui@latest init --yes', { stdio: 'pipe' });
    spinner.succeed('shadcn/ui installed');
  } catch (error) {
    spinner.fail('Failed to install shadcn/ui');
    console.error(chalk.red(error));
    process.exit(1);
  }

  // Update theme in globals.css
  spinner.text = 'Updating theme settings...';
  spinner.start();
  
  try {
    const globalsPath = path.join(projectPath, 'src/app/globals.css');
    let globalsContent = await fs.readFile(globalsPath, 'utf8');
    
    // Replace the theme in globals.css
    globalsContent = globalsContent.replace(/--radius: 0.5rem/g, '--radius: 0.5rem');
    
    // Update theme colors based on selection
    if (theme !== 'zinc') {
      globalsContent = globalsContent.replace(/zinc/g, theme);
    }
    
    await fs.writeFile(globalsPath, globalsContent);
    spinner.succeed(`Theme set to ${theme}`);
  } catch (error) {
    spinner.fail('Failed to update theme');
    console.error(chalk.red(error));
  }

  // Install Clerk
  spinner.text = 'Setting up Clerk Authentication...';
  spinner.start();
  
  try {
    execSync('npm install @clerk/nextjs', { stdio: 'pipe' });
    
    // Create .env file
    const envContent = `
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
CLERK_SECRET_KEY=your_secret_key
    `.trim();
    
    await fs.writeFile(path.join(projectPath, '.env.local'), envContent);
    
    // Update the layout.tsx file with Clerk
    const layoutPath = path.join(projectPath, 'src/app/layout.tsx');
    let layoutContent = await fs.readFile(layoutPath, 'utf8');
    
    // Add Clerk imports
    let updatedLayout = `import { ClerkProvider } from '@clerk/nextjs';\n${layoutContent}`;
    
    // Wrap RootLayout with ClerkProvider
    updatedLayout = updatedLayout.replace(
      'export default function RootLayout({',
      'export default function RootLayout({'
    );
    
    updatedLayout = updatedLayout.replace(
      'return (',
      'return (\n    <ClerkProvider>'
    );
    
    updatedLayout = updatedLayout.replace(
      '</html>',
      '</html>\n    </ClerkProvider>'
    );
    
    await fs.writeFile(layoutPath, updatedLayout);
    
    // Create middleware.ts for Clerk
    const middlewareContent = `
import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware()

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
`.trim();
    
    await fs.writeFile(path.join(projectPath, 'src/middleware.ts'), middlewareContent);
    
    spinner.succeed('Clerk Authentication set up');
  } catch (error) {
    spinner.fail('Failed to set up Clerk Authentication');
    console.error(chalk.red(error));
  }

  // Setup Drizzle ORM if selected
  if (useDrizzle) {
    spinner.text = `Setting up Drizzle ORM with ${drizzleProvider}...`;
    spinner.start();
    
    try {
      // Install base Drizzle packages
      execSync('npm install drizzle-orm', { stdio: 'pipe' });
      execSync('npm install -D drizzle-kit', { stdio: 'pipe' });
      
      // Install provider-specific packages
      if (drizzleProvider === 'postgres') {
        execSync('npm install @vercel/postgres pg', { stdio: 'pipe' });
      } else if (drizzleProvider === 'mysql') {
        execSync('npm install mysql2', { stdio: 'pipe' });
      } else if (drizzleProvider === 'sqlite') {
        execSync('npm install better-sqlite3', { stdio: 'pipe' });
        execSync('npm install -D @types/better-sqlite3', { stdio: 'pipe' });
      }
      
      // Create drizzle directory structure
      await fs.mkdir(path.join(projectPath, 'src/db'), { recursive: true });
      await fs.mkdir(path.join(projectPath, 'src/db/schema'), { recursive: true });
      
      // Create drizzle config file
      const drizzleConfig = `
export default {
  schema: "./src/db/schema",
  out: "./drizzle",
};
`.trim();
      
      await fs.writeFile(path.join(projectPath, 'drizzle.config.ts'), drizzleConfig);
      
      // Create db connection file based on provider
      let dbContent = '';
      
      if (drizzleProvider === 'postgres') {
        dbContent = `
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';

// Use this object to run queries
export const db = drizzle(sql);
`.trim();
      } else if (drizzleProvider === 'mysql') {
        dbContent = `
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';

// Create the connection
const connection = await mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
});

// Use this object to run queries
export const db = drizzle(connection);
`.trim();
      } else if (drizzleProvider === 'sqlite') {
        dbContent = `
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

// Create the connection
const sqlite = new Database('sqlite.db');

// Use this object to run queries
export const db = drizzle(sqlite);
`.trim();
      }
      
      await fs.writeFile(path.join(projectPath, 'src/db/index.ts'), dbContent);
      
      // Create an example schema file
      const schemaContent = `
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Example users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull(),
  createdAt: text('created_at').default(sql\`CURRENT_TIMESTAMP\`),
});
`.trim();
      
      await fs.writeFile(path.join(projectPath, 'src/db/schema/users.ts'), schemaContent);
      
      // Add relevant environment variables
      let envDrizzleContent = '\n# Drizzle Database\n';
      
      if (drizzleProvider === 'postgres') {
        envDrizzleContent += 'POSTGRES_URL="postgres://user:password@localhost:5432/db"\n';
      } else if (drizzleProvider === 'mysql') {
        envDrizzleContent += `
DATABASE_HOST="localhost"
DATABASE_USERNAME="root"
DATABASE_PASSWORD=""
DATABASE_NAME="guava_db"
`.trim();
      }
      
      // Append to .env.local
      const envPath = path.join(projectPath, '.env.local');
      const existingEnv = await fs.readFile(envPath, 'utf8');
      await fs.writeFile(envPath, existingEnv + '\n' + envDrizzleContent);
      
      spinner.succeed(`Drizzle ORM with ${drizzleProvider} set up`);
    } catch (error) {
      spinner.fail('Failed to set up Drizzle ORM');
      console.error(chalk.red(error));
    }
  }

  // Setup Dark Mode if selected
  if (useDarkMode) {
    spinner.text = 'Setting up Dark Mode...';
    spinner.start();
    
    try {
      // Install necessary shadcn components
      execSync('npx shadcn-ui@latest add dropdown-menu', { stdio: 'pipe' });
      
      // Create components directory for the theme toggle
      await fs.mkdir(path.join(projectPath, 'src/components/theme'), { recursive: true });
      
      // Create theme-provider.tsx
      const themeProviderContent = `
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
`.trim();
      
      await fs.writeFile(
        path.join(projectPath, 'src/components/theme/theme-provider.tsx'), 
        themeProviderContent
      );
      
      // Create theme-toggle.tsx
      const themeToggleContent = `
"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
`.trim();
      
      await fs.writeFile(
        path.join(projectPath, 'src/components/theme/theme-toggle.tsx'), 
        themeToggleContent
      );
      
      // Install next-themes
      execSync('npm install next-themes', { stdio: 'pipe' });
      
      // Update layout.tsx to include ThemeProvider
      const layoutPath = path.join(projectPath, 'src/app/layout.tsx');
      let layoutContent = await fs.readFile(layoutPath, 'utf8');
      
      // Add import for ThemeProvider
      layoutContent = layoutContent.replace(
        'import { ClerkProvider } from',
        'import { ThemeProvider } from "@/components/theme/theme-provider";\nimport { ClerkProvider } from'
      );
      
      // Add ThemeProvider inside body
      layoutContent = layoutContent.replace(
        '<body className={inter.className}>',
        '<body className={inter.className}>\n          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>'
      );
      
      layoutContent = layoutContent.replace(
        '{children}',
        '{children}\n          </ThemeProvider>'
      );
      
      await fs.writeFile(layoutPath, layoutContent);
      
      spinner.succeed('Dark Mode set up');
    } catch (error) {
      spinner.fail('Failed to set up Dark Mode');
      console.error(chalk.red(error));
    }
  }

  // Final instructions
  console.log('\n');
  console.log(chalk.green('🎉 Success! Your Guava Stack application is ready.'));
  console.log('\n');
  console.log(chalk.bold('Next steps:'));
  console.log(`  1. cd ${projectName}`);
  console.log('  2. Update your .env.local with your Clerk API keys');
  
  if (useDrizzle) {
    console.log('  3. Configure your database connection in .env.local');
    console.log('  4. Run npx drizzle-kit generate:sqlite to generate migrations (replace sqlite with your provider)');
  }
  
  console.log('  5. npm run dev - to start your development server');
  console.log('\n');
  console.log(chalk.bold('Documentation:'));
  console.log('  - Next.js: https://nextjs.org/docs');
  console.log('  - shadcn/ui: https://ui.shadcn.com');
  console.log('  - Clerk: https://clerk.com/docs/nextjs');
  
  if (useDrizzle) {
    console.log('  - Drizzle ORM: https://orm.drizzle.team/docs/overview');
  }
  
  if (useDarkMode) {
    console.log('  - next-themes: https://github.com/pacocoursey/next-themes');
  }
}

// Run the main function
main().catch(console.error);