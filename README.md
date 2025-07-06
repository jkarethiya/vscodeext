# Copilot Developer Tools MCP Server

A Model Context Protocol (MCP) server designed specifically for GitHub Copilot Chat integration, providing essential developer tools for file operations, code analysis, and system interactions.

## Features

This MCP server provides the following tools for GitHub Copilot Chat:

### 🔧 Core Developer Tools

- **`read-file`** - Read file contents with syntax highlighting
- **`write-file`** - Write content to files with directory creation
- **`list-directory`** - List directory contents with file sizes
- **`get-file-info`** - Get detailed file/directory information
- **`search-files`** - Search for files by name pattern
- **`execute-command`** - Execute shell commands safely

### 🌤️ Demo Tool

- **`get-weather-alerts`** - Get weather alerts for US states (demonstration)

## Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- An MCP client (like GitHub Copilot Chat)

### Installation

1. **Clone and setup the project:**
   ```bash
   git clone <your-repo-url>
   cd mcp
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Test the server:**
   ```bash
   npm start
   ```

### Usage with GitHub Copilot Chat

#### Configuration

1. **Create or update your MCP client configuration** (typically in `~/.config/mcp/settings.json` or similar):
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

2. **For VS Code integration**, add to `.vscode/mcp.json`:
   ```json
   {
     "mcpServers": {
       "copilot-dev-tools": {
         "command": "node",
         "args": ["build/index.js"],
         "cwd": "."
       }
     }
   }
   ```

#### Example Copilot Chat Interactions

Once configured, you can interact with the MCP server through Copilot Chat:

```
👤 "Read the package.json file"
🤖 Uses read-file tool to display package.json with syntax highlighting

👤 "List all TypeScript files in the src directory"
🤖 Uses search-files tool to find *.ts files in src/

👤 "Create a new component file with basic React structure"
🤖 Uses write-file tool to create a new React component

👤 "Show me the file structure of this project"
🤖 Uses list-directory tool to show project structure

👤 "Run the build command"
🤖 Uses execute-command tool to run npm run build

👤 "Get information about the tsconfig.json file"
🤖 Uses get-file-info tool to show file details
```

## Tool Reference

### File Operations

#### `read-file`
- **Purpose**: Read and display file contents with syntax highlighting
- **Parameters**: 
  - `filePath` (string): Path to the file to read
- **Limits**: Maximum file size of 1MB
- **Returns**: Formatted file content with language detection

#### `write-file`
- **Purpose**: Write content to a file
- **Parameters**:
  - `filePath` (string): Path to the file to write
  - `content` (string): Content to write
  - `createDirectories` (boolean, optional): Create parent directories if needed
- **Returns**: Success message with character count

#### `list-directory`
- **Purpose**: List directory contents
- **Parameters**:
  - `directoryPath` (string): Path to directory
  - `includeHidden` (boolean, optional): Include hidden files
  - `recursive` (boolean, optional): List recursively
- **Returns**: Tree view of directory structure with file sizes

#### `get-file-info`
- **Purpose**: Get detailed file or directory information
- **Parameters**:
  - `path` (string): Path to examine
- **Returns**: File stats including size, dates, type, and language detection

#### `search-files`
- **Purpose**: Search for files by name pattern
- **Parameters**:
  - `pattern` (string): Name pattern with wildcard support
  - `directory` (string, optional): Directory to search in
  - `recursive` (boolean, optional): Search recursively
- **Returns**: List of matching file paths

### System Operations

#### `execute-command`
- **Purpose**: Execute shell commands safely
- **Parameters**:
  - `command` (string): Command to execute
  - `workingDirectory` (string, optional): Working directory
  - `timeout` (number, optional): Timeout in milliseconds
- **Limits**: 30-second timeout, 1MB output buffer
- **Returns**: Command output or error message

### Demo Tool

#### `get-weather-alerts`
- **Purpose**: Get weather alerts for US states (demonstration)
- **Parameters**:
  - `state` (string): Two-letter state code (e.g., "CA", "NY")
- **Returns**: Active weather alerts information

## Development

### Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start the MCP server
- `npm run dev` - Build and start in one command

### Project Structure

```
mcp/
├── src/
│   └── index.ts          # Main MCP server implementation
├── build/                # Compiled JavaScript output
├── .vscode/
│   ├── mcp.json         # VS Code MCP configuration
│   └── tasks.json       # VS Code build tasks
├── .github/
│   └── copilot-instructions.md  # Copilot integration guidance
├── package.json
├── tsconfig.json
└── README.md
```

### Adding New Tools

To add a new tool to the MCP server:

1. **Define the tool using the MCP SDK:**
   ```typescript
   server.tool(
     "tool-name",
     "Tool description",
     {
       parameter: z.string().describe("Parameter description"),
     },
     async ({ parameter }) => {
       // Tool implementation
       return {
         content: [
           {
             type: "text",
             text: "Tool output",
           },
         ],
       };
     }
   );
   ```

2. **Rebuild the project:**
   ```bash
   npm run build
   ```

3. **Test with your MCP client**

## Security Considerations

- File operations are limited to prevent abuse (1MB file size limit)
- Command execution has timeouts and output limits
- All paths are resolved to prevent directory traversal attacks
- Error handling prevents sensitive information leakage

## Troubleshooting

### Common Issues

1. **"Module not found" errors**
   - Ensure you've run `npm install` and `npm run build`
   - Check that all dependencies are properly installed

2. **Permission denied errors**
   - Ensure the MCP server has appropriate file system permissions
   - Check file paths are correct and accessible

3. **Connection issues with Copilot Chat**
   - Verify your MCP client configuration
   - Check that the server path and working directory are correct
   - Ensure the server starts without errors

### Debug Mode

To run the server with debug output:
```bash
node build/index.js 2>&1 | tee debug.log
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License - See LICENSE file for details.

## Related Links

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [GitHub Copilot Chat Documentation](https://docs.github.com/en/copilot/github-copilot-chat)
