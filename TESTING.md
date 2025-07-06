# Testing SonarQube Auto-Fix Extension

## Testing All Chat Modes

The extension registers `@sonar-agent` as a chat participant that supports **ask mode**, **agent mode**, and **edit mode**.

### Quick Test Steps

1. **Install the extension** in VS Code (F5 to run in development mode)
2. **Open Copilot Chat** (Ctrl+Shift+P → "GitHub Copilot Chat: Open Chat")
3. **Test the participant**: Type `@sonar-agent help` in the chat
4. **Check for modes**: Look for different interaction patterns based on the mode

### Chat Modes Explained

#### 🤔 **Ask Mode** (Always Available)
- **What it is**: Basic Q&A with the agent
- **How to use**: Type `@sonar-agent` followed by your question
- **Example**: `@sonar-agent what can you do?`
- **Expected**: Direct response without follow-up suggestions

#### 🎯 **Agent Mode** (Follow-up Suggestions)
- **What it is**: Proactive suggestions after each response
- **How to identify**: Look for clickable buttons/suggestions below responses
- **Example**: After asking for help, you should see buttons like:
  - ⚙️ Configure SonarQube
  - 🔍 Fetch Issues
  - ❓ Help
- **Expected**: Interactive workflow with contextual suggestions

#### ✏️ **Edit Mode** (Code Modification)
- **What it is**: Direct code editing assistance
- **How to use**: Select code and ask for fixes
- **Example**: Select problematic code → `@sonar-agent fix this sonar issue`
- **Expected**: Specific code improvement suggestions and fixes

### Testing Commands

Run these commands in VS Code Command Palette (Ctrl+Shift+P):

1. **`SonarQube Auto-Fix: Test Chat Participant Registration`**
   - Shows VS Code version, extension status, and **all supported modes**
   - Shows GitHub Copilot and Copilot Chat extension versions

2. **`SonarQube Auto-Fix: Configure SonarQube Settings`**
   - Configure SonarQube server URL, token, and project key

3. **`SonarQube Auto-Fix: Check GitHub Copilot Availability`**
   - Verifies Copilot Chat extension is installed and working

### Mode-Specific Testing

#### Testing Ask Mode
```
@sonar-agent help
@sonar-agent what can you do?
@sonar-agent show me sonar issues
```

#### Testing Agent Mode
1. Type: `@sonar-agent help`
2. **Look for follow-up buttons** below the response
3. Click the buttons to test interactive workflow
4. Each response should provide contextual next steps

#### Testing Edit Mode
1. **Open a code file** with potential issues
2. **Select some code** (highlight it)
3. Type: `@sonar-agent fix this code`
4. Should provide **specific editing suggestions**

### Expected Behavior by Mode

#### Ask Mode Response
```
## 🤖 SonarQube Agent Help
I'm your AI assistant for managing SonarQube issues...
```

#### Agent Mode Response
```
## 🤖 SonarQube Agent Help
I'm your AI assistant for managing SonarQube issues...

[⚙️ Configure SonarQube] [🔍 Fetch Issues] [❓ Help]
```

#### Edit Mode Response
```
## 🔧 Code Edit Mode
I can help you fix code issues. Here's what I can do in edit mode...
```

### Chat Commands to Test

- `@sonar-agent help` - Shows all available commands
- `@sonar-agent /config` - Configure SonarQube settings
- `@sonar-agent /fetch` - Fetch SonarQube issues
- `@sonar-agent /fix-all` - Auto-fix all issues
- `@sonar-agent /analyze` - Analyze issues
- `@sonar-agent What can you do?` - Natural language query
- `@sonar-agent fix this code` - Edit mode request

### Troubleshooting

#### If Only Ask Mode is Available:
1. **Check VS Code version** (requires 1.102.0+)
2. **Update Copilot Chat** extension to latest version
3. **Check console logs** (Help → Toggle Developer Tools → Console)
4. **Look for error messages** in the extension output

#### If Agent Mode is Missing:
- Look for debug messages: `🔄 provideFollowups called - Agent mode is working!`
- Check if `followupProvider not available` appears in logs
- Verify VS Code and Copilot Chat versions

#### If Edit Mode is Missing:
- Look for: `editProvider not available in this VS Code version`
- Update VS Code to the latest version
- Ensure Copilot Chat supports edit mode

### Debug Logs

The extension logs important information to the console:
- `✅ SonarQube Agent registered with modes: ask, agent, edit`
- `🔄 provideFollowups called - Agent mode is working!`
- `📋 Returning X followups`
- `Received edit request: ...`

### Requirements

- **VS Code 1.102.0+** (latest recommended)
- **GitHub Copilot extension** (latest)
- **GitHub Copilot Chat extension** (latest)

### Version Compatibility

| VS Code Version | Ask Mode | Agent Mode | Edit Mode |
|----------------|----------|------------|-----------|
| 1.95.0-1.100.x | ✅ | ⚠️ Limited | ❌ |
| 1.101.0-1.101.x | ✅ | ✅ | ⚠️ Limited |
| 1.102.0+ | ✅ | ✅ | ✅ |

**Note**: Your current VS Code version is 1.101.2, so you should have Ask and Agent modes, but Edit mode may be limited.
