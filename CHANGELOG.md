# Change Log

All notable changes to the "SonarQube Auto-Fix" extension will be documented in this file.

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