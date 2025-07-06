# SonarQube Auto-Fix Extension

This VS Code extension provides a GitHub Copilot Chat participant (`@sonar-agent`) that helps you manage and fix SonarQube issues directly through natural language conversations.

## Features

- **🤖 Chat Participant**: Use `@sonar-agent` in GitHub Copilot Chat
- **🔍 Issue Detection**: Fetch and analyze SonarQube issues
- **🔧 AI-Powered Fixes**: Get intelligent fix suggestions
- **📊 Issue Analytics**: View issues grouped by severity
- **🌊 Git Integration**: Automatic branch creation and PR management
- **⚙️ Easy Configuration**: Interactive setup through chat

## Quick Start

1. **Install the extension**
2. **Open GitHub Copilot Chat** (Ctrl+Shift+I)
3. **Type `@sonar-agent help`** to see all available commands
4. **Configure SonarQube**: `@sonar-agent config`
5. **Fetch issues**: `@sonar-agent fetch issues`
6. **Fix issues**: `@sonar-agent fix all issues`

## Chat Commands

### 🔍 **Issue Management**
- `@sonar-agent fetch issues` - List all SonarQube issues
- `@sonar-agent list issues` - Same as above
- `@sonar-agent show issues` - Display issues with details

### 🔧 **Fix Issues**
- `@sonar-agent fix all issues` - Start auto-fix process for all issues
- `@sonar-agent fix issue ABC-123` - Fix a specific issue by key
- `@sonar-agent fix this issue` - Fix the currently selected issue

### ⚙️ **Configuration**
- `@sonar-agent config` - Configure SonarQube settings
- `@sonar-agent setup` - Interactive setup wizard
- `@sonar-agent check config` - Verify current configuration

### 📊 **Analysis**
- `@sonar-agent analyze issues` - Get detailed analysis
- `@sonar-agent statistics` - Show issue statistics
- `@sonar-agent help` - Show all available commands

## Example Conversations

### Getting Started
```
You: @sonar-agent help
SonarQube Agent: I'm your AI assistant for managing SonarQube issues! Here's what I can do:
- Fetch issues from your SonarQube server
- Fix issues automatically using AI
- Configure SonarQube settings
- Analyze code quality metrics
```

### Fetching Issues
```
You: @sonar-agent fetch issues
SonarQube Agent: 🔍 Found 12 SonarQube Issues

🚨 BLOCKER (2)
- UserController.java:45 - Potential null pointer dereference
- DataService.java:123 - SQL injection vulnerability

❗ CRITICAL (3)
- AuthService.java:67 - Hardcoded credentials
...
```

### Fixing Issues
```
You: @sonar-agent fix all issues
SonarQube Agent: 🔧 Auto-Fix Process Started
Found 12 issues to fix. This process will:
1. Create a new Git branch: sonar-auto-fix
2. Fix each issue one by one
3. Commit each fix individually
4. Push the branch and create a PR
```

## Prerequisites

1. **GitHub Copilot Chat**: Must be installed and active in VS Code
2. **SonarQube Server**: Access to a SonarQube instance
3. **Git Repository**: Project must be in a Git repository
4. **SonarQube Token**: Authentication token for SonarQube API

## Installation

1. Install the extension in VS Code
2. Configure SonarQube settings (see Configuration section)

## Configuration

### Quick Setup
1. Open Command Palette (`Ctrl+Shift+P`)
2. Run `Configure SonarQube Settings`
3. Enter your SonarQube details:
   - Server URL (e.g., `http://localhost:9000`)
   - Authentication token
   - Project key
   - Branch name for fixes (default: `sonar-auto-fix`)

### Manual Configuration
Add these settings to your workspace settings (`.vscode/settings.json`):

```json
{
  "sonarAutoFix.sonarUrl": "http://localhost:9000",
  "sonarAutoFix.sonarToken": "your-sonar-token",
  "sonarAutoFix.projectKey": "your-project-key",
  "sonarAutoFix.gitBranch": "sonar-auto-fix"
}
```

## Usage

1. **Configure Settings**: First time setup using the configuration command
2. **Check Copilot**: Run `Check GitHub Copilot Availability` to verify setup
3. **Run Auto-Fix**: 
   - Open Command Palette (`Ctrl+Shift+P`)
   - Run `Auto-Fix SonarQube Bugs`
   - The extension will:
     - Fetch issues from SonarQube
     - Create a new Git branch
     - Open each issue with Copilot Chat guidance
     - Wait for your confirmation after each fix
     - Commit each fix individually
     - Push the branch to remote
     - Offer to create a pull request

## Commands

- `Auto-Fix SonarQube Bugs`: Main command to start the auto-fix process
- `Configure SonarQube Settings`: Interactive setup for SonarQube connection
- `Check GitHub Copilot Availability`: Verify if Copilot Chat is properly installed

## How It Works

1. **Copilot Check**: Verifies GitHub Copilot Chat is available
2. **Issue Fetching**: Connects to SonarQube API to get all unresolved bugs, vulnerabilities, and code smells
3. **File Resolution**: Maps SonarQube components to actual files in your workspace
4. **AI Fixing**: For each issue:
   - Opens the problematic file
   - Navigates to the specific line
   - Opens GitHub Copilot Chat with a detailed fix prompt
   - Waits for user to review and apply the fix
5. **Git Operations**: 
   - Creates commits for each fix
   - Pushes changes to a new branch
   - Opens GitHub PR creation page

## Interactive Fix Process

The extension uses an interactive approach:

1. **Copilot Chat Integration**: Opens Copilot Chat with detailed context about each issue
2. **User Confirmation**: Asks you to confirm when each fix is applied
3. **Fallback Mode**: If Copilot Chat is not available, provides manual fix guidance
4. **Progress Tracking**: Shows progress as issues are resolved

## Supported Issue Types

- **Bugs**: Logic errors and potential runtime issues
- **Vulnerabilities**: Security-related issues
- **Code Smells**: Maintainability issues
- **Severities**: BLOCKER, CRITICAL, MAJOR

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `sonarAutoFix.sonarUrl` | SonarQube server URL | `http://localhost:9000` |
| `sonarAutoFix.sonarToken` | SonarQube authentication token | `""` |
| `sonarAutoFix.projectKey` | SonarQube project key | `""` |
| `sonarAutoFix.gitBranch` | Git branch name for fixes | `sonar-auto-fix` |

## Troubleshooting

### Common Issues

1. **"No workspace folder found"**: Ensure you have a folder open in VS Code
2. **"SonarQube token and project key must be configured"**: Run the configuration command first
3. **"command 'github.copilot-chat...' not found"**: Install GitHub Copilot Chat extension
4. **"File not found"**: Ensure your project structure matches SonarQube analysis

### Checking Copilot Chat

Use the `Check GitHub Copilot Availability` command to:
- Verify Copilot Chat is installed
- See available Copilot commands
- Get help installing required extensions

### Required Extensions

- **GitHub Copilot**: Base Copilot functionality
- **GitHub Copilot Chat**: Interactive chat interface (required for auto-fixing)

### Logs

Check the "SonarQube Auto-Fix" output channel for detailed logs:
1. Open Output panel (`Ctrl+Shift+U`)
2. Select "SonarQube Auto-Fix" from the dropdown

## Limitations

- Requires GitHub Copilot Chat subscription
- Interactive process requires user confirmation for each fix
- Works best with well-structured code
- Some complex issues may require manual intervention
- Limited to GitHub repositories for PR creation

## Contributing

1. Clone the repository
2. Run `npm install`
3. Make your changes
4. Run `npm run compile` to test
5. Submit a pull request

## License

MIT License - see LICENSE file for details
