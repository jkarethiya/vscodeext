#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync, mkdirSync } from "fs";
import { execSync } from "child_process";
import { join, dirname, basename, extname, resolve } from "path";

const server = new McpServer({
  name: "copilot-dev-tools",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Developer Tools for Copilot Chat Integration

// Helper function to format file content for display
function formatFileContent(content: string, filePath: string): string {
  const extension = extname(filePath).toLowerCase();
  const language = getLanguageFromExtension(extension);
  return `\`\`\`${language}\n${content}\n\`\`\``;
}

function getLanguageFromExtension(ext: string): string {
  const langMap: { [key: string]: string } = {
    '.js': 'javascript',
    '.ts': 'typescript',
    '.jsx': 'jsx',
    '.tsx': 'tsx',
    '.py': 'python',
    '.java': 'java',
    '.c': 'c',
    '.cpp': 'cpp',
    '.cs': 'csharp',
    '.go': 'go',
    '.rs': 'rust',
    '.php': 'php',
    '.rb': 'ruby',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
    '.sh': 'bash',
    '.ps1': 'powershell',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'sass',
    '.less': 'less',
    '.json': 'json',
    '.xml': 'xml',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.toml': 'toml',
    '.md': 'markdown',
    '.sql': 'sql',
    '.r': 'r',
    '.m': 'matlab',
    '.pl': 'perl',
    '.lua': 'lua',
    '.vim': 'vim',
    '.dockerfile': 'dockerfile',
  };
  return langMap[ext] || 'text';
}

// Tool: Read file contents
server.tool(
  "read-file",
  "Read the contents of a file",
  {
    filePath: z.string().describe("Path to the file to read"),
  },
  async ({ filePath }) => {
    try {
      const resolvedPath = resolve(filePath);
      
      if (!existsSync(resolvedPath)) {
        return {
          content: [
            {
              type: "text",
              text: `File not found: ${filePath}`,
            },
          ],
        };
      }

      const stats = statSync(resolvedPath);
      if (!stats.isFile()) {
        return {
          content: [
            {
              type: "text",
              text: `Path is not a file: ${filePath}`,
            },
          ],
        };
      }

      // Check file size (limit to 1MB for safety)
      if (stats.size > 1024 * 1024) {
        return {
          content: [
            {
              type: "text",
              text: `File is too large (${(stats.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 1MB.`,
            },
          ],
        };
      }

      const content = readFileSync(resolvedPath, 'utf8');
      const formattedContent = formatFileContent(content, filePath);
      
      return {
        content: [
          {
            type: "text",
            text: `File: ${filePath}\n\n${formattedContent}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
);

// Tool: Write file contents
server.tool(
  "write-file",
  "Write content to a file",
  {
    filePath: z.string().describe("Path to the file to write"),
    content: z.string().describe("Content to write to the file"),
    createDirectories: z.boolean().optional().default(true).describe("Create parent directories if they don't exist"),
  },
  async ({ filePath, content, createDirectories }) => {
    try {
      const resolvedPath = resolve(filePath);
      
      if (createDirectories) {
        const dir = dirname(resolvedPath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
      }

      writeFileSync(resolvedPath, content, 'utf8');
      
      return {
        content: [
          {
            type: "text",
            text: `Successfully wrote ${content.length} characters to ${filePath}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error writing file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
);

// Tool: List directory contents
server.tool(
  "list-directory",
  "List contents of a directory",
  {
    directoryPath: z.string().describe("Path to the directory to list"),
    includeHidden: z.boolean().optional().default(false).describe("Include hidden files and directories"),
    recursive: z.boolean().optional().default(false).describe("List recursively"),
  },
  async ({ directoryPath, includeHidden, recursive }) => {
    try {
      const resolvedPath = resolve(directoryPath);
      
      if (!existsSync(resolvedPath)) {
        return {
          content: [
            {
              type: "text",
              text: `Directory not found: ${directoryPath}`,
            },
          ],
        };
      }

      const stats = statSync(resolvedPath);
      if (!stats.isDirectory()) {
        return {
          content: [
            {
              type: "text",
              text: `Path is not a directory: ${directoryPath}`,
            },
          ],
        };
      }

      const listFiles = (dir: string, prefix: string = ""): string[] => {
        const items = readdirSync(dir);
        const result: string[] = [];
        
        for (const item of items) {
          if (!includeHidden && item.startsWith('.')) continue;
          
          const itemPath = join(dir, item);
          const itemStats = statSync(itemPath);
          const displayName = prefix + item;
          
          if (itemStats.isDirectory()) {
            result.push(`📁 ${displayName}/`);
            if (recursive) {
              result.push(...listFiles(itemPath, prefix + "  "));
            }
          } else {
            const size = itemStats.size;
            const sizeStr = size > 1024 ? `${(size / 1024).toFixed(1)}KB` : `${size}B`;
            result.push(`📄 ${displayName} (${sizeStr})`);
          }
        }
        
        return result;
      };

      const items = listFiles(resolvedPath);
      const itemsText = items.join('\n');
      
      return {
        content: [
          {
            type: "text",
            text: `Directory: ${directoryPath}\n\n${itemsText}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error listing directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
);

// Tool: Execute shell command
server.tool(
  "execute-command",
  "Execute a shell command",
  {
    command: z.string().describe("Command to execute"),
    workingDirectory: z.string().optional().describe("Working directory for the command"),
    timeout: z.number().optional().default(30000).describe("Timeout in milliseconds"),
  },
  async ({ command, workingDirectory, timeout }) => {
    try {
      const options: any = {
        encoding: 'utf8',
        timeout: timeout,
        maxBuffer: 1024 * 1024, // 1MB buffer
      };
      
      if (workingDirectory) {
        options.cwd = resolve(workingDirectory);
      }

      const output = execSync(command, options);
      
      return {
        content: [
          {
            type: "text",
            text: `Command: ${command}\n\nOutput:\n\`\`\`\n${output}\n\`\`\``,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: "text",
            text: `Command failed: ${command}\n\nError: ${errorMessage}`,
          },
        ],
      };
    }
  }
);

// Tool: Search for files
server.tool(
  "search-files",
  "Search for files by name pattern",
  {
    pattern: z.string().describe("File name pattern to search for (supports wildcards)"),
    directory: z.string().optional().default('.').describe("Directory to search in"),
    recursive: z.boolean().optional().default(true).describe("Search recursively"),
  },
  async ({ pattern, directory, recursive }) => {
    try {
      const resolvedDir = resolve(directory);
      
      if (!existsSync(resolvedDir)) {
        return {
          content: [
            {
              type: "text",
              text: `Directory not found: ${directory}`,
            },
          ],
        };
      }

      const searchFiles = (dir: string, basePath: string = ""): string[] => {
        const items = readdirSync(dir);
        const results: string[] = [];
        
        for (const item of items) {
          const itemPath = join(dir, item);
          const relativePath = join(basePath, item);
          const stats = statSync(itemPath);
          
          if (stats.isDirectory()) {
            if (recursive) {
              results.push(...searchFiles(itemPath, relativePath));
            }
          } else {
            // Simple pattern matching (supports * wildcards)
            const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
            if (regex.test(item)) {
              results.push(relativePath);
            }
          }
        }
        
        return results;
      };

      const matches = searchFiles(resolvedDir);
      
      if (matches.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No files found matching pattern: ${pattern}`,
            },
          ],
        };
      }

      const matchesText = matches.join('\n');
      
      return {
        content: [
          {
            type: "text",
            text: `Found ${matches.length} files matching "${pattern}":\n\n${matchesText}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching files: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
);

// Tool: Get file info
server.tool(
  "get-file-info",
  "Get detailed information about a file or directory",
  {
    path: z.string().describe("Path to the file or directory"),
  },
  async ({ path }) => {
    try {
      const resolvedPath = resolve(path);
      
      if (!existsSync(resolvedPath)) {
        return {
          content: [
            {
              type: "text",
              text: `Path not found: ${path}`,
            },
          ],
        };
      }

      const stats = statSync(resolvedPath);
      const isDirectory = stats.isDirectory();
      const isFile = stats.isFile();
      
      const info = [
        `Path: ${path}`,
        `Resolved: ${resolvedPath}`,
        `Type: ${isDirectory ? 'Directory' : isFile ? 'File' : 'Other'}`,
        `Size: ${stats.size} bytes${stats.size > 1024 ? ` (${(stats.size / 1024).toFixed(1)}KB)` : ''}`,
        `Created: ${stats.birthtime.toISOString()}`,
        `Modified: ${stats.mtime.toISOString()}`,
        `Accessed: ${stats.atime.toISOString()}`,
      ];

      if (isFile) {
        info.push(`Extension: ${extname(resolvedPath)}`);
        info.push(`Language: ${getLanguageFromExtension(extname(resolvedPath))}`);
      }

      if (isDirectory) {
        const items = readdirSync(resolvedPath);
        info.push(`Items: ${items.length}`);
      }
      
      return {
        content: [
          {
            type: "text",
            text: info.join('\n'),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting file info: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
);

// Keep one simple weather tool for demonstration
server.tool(
  "get-weather-alerts",
  "Get weather alerts for a US state (demo tool)",
  {
    state: z.string().length(2).describe("Two-letter state code (e.g. CA, NY)"),
  },
  async ({ state }) => {
    const stateCode = state.toUpperCase();
    const alertsUrl = `https://api.weather.gov/alerts?area=${stateCode}`;
    
    try {
      const response = await fetch(alertsUrl, {
        headers: {
          "User-Agent": "copilot-dev-tools/1.0",
          Accept: "application/geo+json",
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const features = data.features || [];
      
      if (features.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No active weather alerts for ${stateCode}`,
            },
          ],
        };
      }
      
      const alerts = features.map((feature: any) => {
        const props = feature.properties || {};
        return [
          `🚨 ${props.event || 'Unknown Event'}`,
          `Area: ${props.areaDesc || 'Unknown Area'}`,
          `Severity: ${props.severity || 'Unknown'}`,
          `Status: ${props.status || 'Unknown'}`,
          `Headline: ${props.headline || 'No headline'}`,
          '---'
        ].join('\n');
      });
      
      return {
        content: [
          {
            type: "text",
            text: `Weather alerts for ${stateCode}:\n\n${alerts.join('\n')}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to retrieve weather alerts: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Copilot Developer Tools MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
