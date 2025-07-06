# Change Log

All notable changes to the "SonarQube Auto-Fix" extension will be documented in this file.

## [0.1.0] - 2025-07-06

### Added
- **🤖 GitHub Copilot Chat Participant**: `@sonar-agent` for natural language interaction
- **🔍 Intelligent Issue Fetching**: Fetch and analyze SonarQube issues through chat
- **🔧 Interactive Fix Process**: Fix issues through conversational interface
- **📊 Issue Analytics**: View issues grouped by severity with emoji indicators
- **⚙️ Chat-based Configuration**: Configure SonarQube settings through chat
- **💡 Contextual Help**: Comprehensive help system within chat
- **🎯 Specific Issue Fixing**: Fix individual issues by key through chat
- **📱 File Navigation**: Automatically open and navigate to problematic code
- **🔄 Process Tracking**: Real-time progress updates during fix process

### Chat Commands
- `@sonar-agent fetch issues` - List all SonarQube issues
- `@sonar-agent fix all issues` - Start auto-fix process for all issues
- `@sonar-agent fix issue <key>` - Fix a specific issue
- `@sonar-agent config` - Configure SonarQube settings
- `@sonar-agent help` - Show all available commands
- `@sonar-agent analyze issues` - Get detailed issue analysis
- `@sonar-agent statistics` - Show issue statistics

### Enhanced Features
- Interactive chat-based workflow
- Real-time issue analysis and suggestions
- Contextual code navigation
- Severity-based issue grouping
- Enhanced error handling and user feedback

## [0.0.1] - 2025-07-06

### Added
- Initial release of SonarQube Auto-Fix extension
- Integration with SonarQube API to fetch bugs, vulnerabilities, and code smells
- GitHub Copilot Chat integration for AI-powered fix suggestions
- Interactive fix process with user confirmation
- Automatic Git branch creation and management
- Individual commit creation for each fix
- Pull request creation assistance
- Configurable settings for SonarQube connection
- Copilot availability checking
- Comprehensive logging and error handling
- Fallback mode for manual fixes when Copilot is unavailable

### Features
- `Auto-Fix SonarQube Bugs`: Main command to start the auto-fix process
- `Configure SonarQube Settings`: Interactive setup for SonarQube connection
- `Check GitHub Copilot Availability`: Verify if Copilot Chat is properly installed

### Configuration
- `sonarAutoFix.sonarUrl`: SonarQube server URL
- `sonarAutoFix.sonarToken`: SonarQube authentication token
- `sonarAutoFix.projectKey`: SonarQube project key
- `sonarAutoFix.gitBranch`: Git branch name for fixes

### Requirements
- GitHub Copilot Chat extension
- SonarQube server access
- Git repository
- Valid SonarQube authentication token