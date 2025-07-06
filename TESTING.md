# Testing SonarQube Auto-Fix Extension

## Testing Agent Mode

The extension registers `@sonar-agent` as a chat participant that supports both **ask mode** and **agent mode**.

### Quick Test Steps

1. **Install the extension** in VS Code (F5 to run in development mode)
2. **Open Copilot Chat** (Ctrl+Shift+P → "GitHub Copilot Chat: Open Chat")
3. **Test the participant**: Type `@sonar-agent help` in the chat
4. **Check for followups**: Look for suggested actions/buttons below the response

### Agent Mode vs Ask Mode

- **Ask Mode**: Only responds to direct questions, no follow-up suggestions
- **Agent Mode**: Provides follow-up suggestions as clickable buttons after each response

### Testing Commands

Run these commands in VS Code Command Palette (Ctrl+Shift+P):

1. `SonarQube Auto-Fix: Test Chat Participant Registration`
   - Shows VS Code version, extension status, and agent mode availability
   - Shows GitHub Copilot and Copilot Chat extension versions

2. `SonarQube Auto-Fix: Configure SonarQube Settings`
   - Configure SonarQube server URL, token, and project key

3. `SonarQube Auto-Fix: Check GitHub Copilot Availability`
   - Verifies Copilot Chat extension is installed and working

### Expected Behavior in Agent Mode

When you type `@sonar-agent help`, you should see:
1. A helpful response about available commands
2. **Follow-up buttons** below the response like:
   - ⚙️ Configure SonarQube
   - 🔍 Fetch Issues
   - ❓ Help

### Chat Commands to Test

- `@sonar-agent help` - Shows all available commands
- `@sonar-agent /config` - Configure SonarQube settings
- `@sonar-agent /fetch` - Fetch SonarQube issues
- `@sonar-agent /fix-all` - Auto-fix all issues
- `@sonar-agent /analyze` - Analyze issues
- `@sonar-agent What can you do?` - Natural language query

### Troubleshooting

If agent mode is not working:
1. Check VS Code version (should be 1.95.0+)
2. Verify Copilot Chat extension is installed and up to date
3. Check console logs (Help → Toggle Developer Tools → Console)
4. Look for debug messages starting with `🔄 provideFollowups called`

### Debug Logs

The extension logs debug information to the console:
- `✅ Chat participant registered with followup provider`
- `🔄 provideFollowups called - Agent mode is working!`
- `📋 Returning X followups`

### Requirements

- VS Code 1.95.0 or higher
- GitHub Copilot extension
- GitHub Copilot Chat extension
