# Example MCP Server Integration with GitHub Copilot Chat

This document provides examples of how to use the Copilot Developer Tools MCP Server with GitHub Copilot Chat.

## Setup Instructions

1. **Build the MCP Server**
   ```bash
   npm run build
   ```

2. **Configure GitHub Copilot Chat**
   
   Add the following to your MCP client configuration file:
   ```json
   {
     "servers": {
       "copilot-dev-tools": {
         "command": "node",
         "args": ["E:\\GitHub\\vscodeext\\mcp\\build\\index.js"],
         "cwd": "E:\\GitHub\\vscodeext\\mcp"
       }
     }
   }
   ```

3. **Test the Integration**

   Once configured, you can use these commands with GitHub Copilot Chat:

## Example Commands

### File Operations

**Read a file:**
```
@copilot read the package.json file
```

**Create a new file:**
```
@copilot create a new React component called UserProfile with basic structure
```

**List project files:**
```
@copilot show me the structure of this project
```

### Code Analysis

**Search for files:**
```
@copilot find all TypeScript files in the src directory
```

**Get file information:**
```
@copilot tell me about the tsconfig.json file
```

### Development Tasks

**Run build command:**
```
@copilot build the project
```

**Install dependencies:**
```
@copilot install the required npm packages
```

**Check project status:**
```
@copilot run git status to see what files have changed
```

### Project Setup

**Initialize a new project:**
```
@copilot help me set up a new TypeScript project with the necessary configuration files
```

**Create documentation:**
```
@copilot generate a README.md file for this project
```

## Advanced Usage

### Custom Scripts

You can also ask Copilot to create and run custom scripts:

```
@copilot create a script that counts the lines of code in all TypeScript files
```

### File Analysis

```
@copilot analyze the src/index.ts file and suggest improvements
```

### Project Management

```
@copilot check if there are any unused dependencies in package.json
```

## Troubleshooting

If the MCP server is not working:

1. Check that the build files exist in the `build/` directory
2. Verify the configuration file path is correct
3. Make sure Node.js is installed and accessible
4. Check the MCP client logs for connection errors

## Available Tools

The MCP server provides these tools for Copilot Chat:

- `read-file` - Read file contents
- `write-file` - Write content to files
- `list-directory` - List directory contents
- `get-file-info` - Get file information
- `search-files` - Search for files by pattern
- `execute-command` - Run shell commands
- `get-weather-alerts` - Get weather alerts (demo)

## Notes

- The server runs as a stdio MCP server
- All file operations are relative to the project directory
- Commands have built-in safety limits (file size, timeout, etc.)
- The server supports syntax highlighting for code files
