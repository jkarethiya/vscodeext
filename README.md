# SonarQube Auto-Fix Extension

This VS Code extension automatically fixes SonarQube bugs using GitHub Copilot Chat and creates pull requests with the fixes.

## Features

- **Automatic Bug Detection**: Fetches bugs from SonarQube API
- **AI-Powered Fixes**: Uses GitHub Copilot Chat to automatically fix issues
- **Git Integration**: Creates a new branch for fixes
- **Pull Request Creation**: Automatically pushes fixes and helps create PRs
- **Configurable**: Easy setup through VS Code settings

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
