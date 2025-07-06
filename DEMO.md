# SonarQube Chat Agent Demo Guide

## Getting Started

1. **Install the Extension**
   - Press `F5` to launch Extension Development Host
   - Or install from the marketplace when published

2. **Open Copilot Chat**
   - Press `Ctrl+Shift+I` (or `Cmd+Shift+I` on Mac)
   - Or click the chat icon in the Activity Bar

3. **Start Chatting with the Agent**
   - Type `@sonar-agent` followed by your request
   - The agent will appear in the participant list

## Demo Scenarios

### Scenario 1: First Time Setup
```
You: @sonar-agent help
Agent: 🤖 SonarQube Agent Help
I'm your AI assistant for managing SonarQube issues...

You: @sonar-agent config
Agent: ⚙️ SonarQube Configuration
To use the SonarQube agent, you need to configure...
```

### Scenario 2: Fetching Issues
```
You: @sonar-agent fetch issues
Agent: 🔍 Found 15 SonarQube Issues

🚨 BLOCKER (3)
- UserController.java:45 - Potential null pointer dereference
- DataService.java:123 - SQL injection vulnerability
- AuthService.java:89 - Hardcoded password

❗ CRITICAL (5)
- PaymentService.java:156 - Insecure random number generation
...
```

### Scenario 3: Fixing Specific Issue
```
You: @sonar-agent fix issue ABC-123
Agent: 🔍 Issue Details: ABC-123
File: UserController.java
Line: 45
Rule: java:S2259
Severity: BLOCKER
Message: Potential null pointer dereference
...
```

### Scenario 4: Fix All Issues
```
You: @sonar-agent fix all issues
Agent: 🔧 Auto-Fix Process Started
Found 15 issues to fix. This process will:
1. Create a new Git branch: sonar-auto-fix
2. Fix each issue one by one
3. Commit each fix individually
4. Push the branch and create a PR

🚀 Auto-fix process initiated! Check notifications for progress.
```

## Key Features Demonstrated

### 1. **Natural Language Processing**
- Understands various ways to ask for the same thing
- "fetch issues", "list issues", "show issues" all work
- "fix all", "fix everything", "fix all issues" all trigger the same action

### 2. **Contextual Responses**
- Provides relevant emojis and formatting
- Groups issues by severity
- Shows progress indicators

### 3. **Interactive Configuration**
- Guides users through setup
- Validates configuration
- Provides helpful error messages

### 4. **Code Navigation**
- Opens files at specific lines
- Highlights problematic code
- Provides context around issues

### 5. **Process Management**
- Tracks progress of long-running operations
- Provides feedback on success/failure
- Integrates with existing VS Code commands

## Testing Tips

1. **Mock SonarQube Server**
   - Use a local SonarQube instance
   - Or modify the code to use mock data for testing

2. **Test Different Scenarios**
   - No issues found
   - Configuration errors
   - Network connectivity issues
   - Git repository not initialized

3. **Verify Chat Integration**
   - Check that `@sonar-agent` appears in participant list
   - Verify responses are properly formatted
   - Test various command variations

## Common Issues and Solutions

### Issue: Chat participant not appearing
**Solution**: Check that the extension is activated and `chatParticipants` is properly registered in `package.json`

### Issue: SonarQube API errors
**Solution**: Verify SonarQube server is running and token is valid

### Issue: Git operations failing
**Solution**: Ensure workspace has a Git repository initialized

### Issue: TypeScript compilation errors
**Solution**: Check VS Code API versions and update type definitions

## Next Steps

1. **Test with Real SonarQube Data**
2. **Add More Sophisticated Fix Suggestions**
3. **Implement Rule-Specific Fix Patterns**
4. **Add Support for Different Languages**
5. **Create Custom Fix Templates**
6. **Add Integration Tests**
7. **Publish to VS Code Marketplace**
