// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import axios from 'axios';
import * as path from 'path';
import simpleGit, { SimpleGit } from 'simple-git';

interface SonarIssue {
    key: string;
    rule: string;
    severity: string;
    component: string;
    line?: number;
    message: string;
    status: string;
    type: string;
}

interface SonarResponse {
    issues: SonarIssue[];
    total: number;
}

class SonarAutoFix {
    private git: SimpleGit;
    private outputChannel: vscode.OutputChannel;
    private config: vscode.WorkspaceConfiguration;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('SonarQube Auto-Fix');
        this.config = vscode.workspace.getConfiguration('sonarAutoFix');
        
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            this.git = simpleGit(workspaceFolder.uri.fsPath);
        } else {
            throw new Error('No workspace folder found');
        }
    }

    private log(message: string) {
        this.outputChannel.appendLine(`[${new Date().toISOString()}] ${message}`);
        console.log(message);
    }

    private async getSonarConfig() {
        const sonarUrl = this.config.get<string>('sonarUrl') || 'http://localhost:9000';
        const sonarToken = this.config.get<string>('sonarToken') || 'sqp_41345b81ffd02fd1b33c21abffeccc835881ffb1';
        const projectKey = this.config.get<string>('projectKey') || 'spring-boot-sonar';

        if (!sonarToken || !projectKey) {
            throw new Error('SonarQube token and project key must be configured');
        }

        return { sonarUrl, sonarToken, projectKey };
    }

    async fetchSonarIssues(): Promise<SonarIssue[]> {
        try {
            const { sonarUrl, sonarToken, projectKey } = await this.getSonarConfig();
            
            this.log('Fetching SonarQube issues...');
            
            const response = await axios.get<SonarResponse>(`${sonarUrl}/api/issues/search`, {
                params: {
                    componentKeys: projectKey,
                    types: 'BUG',
                    resolved: false,
                    severities: 'BLOCKER,CRITICAL,MAJOR',
                    ps: 100 // page size
                },
                headers: {
                    Authorization: `Bearer ${sonarToken}`
                }
            });

            this.log(`Found ${response.data.issues.length} issues`);
            return response.data.issues;
        } catch (error) {
            this.log(`Error fetching SonarQube issues: ${error}`);
            throw error;
        }
    }

    private async getFilePathFromComponent(component: string): Promise<string | null> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return null;
        }

        // Extract file path from component (format: projectKey:relativePath)
        const colonIndex = component.indexOf(':');
        if (colonIndex === -1) {
            return null;
        }

        const relativePath = component.substring(colonIndex + 1);
        const fullPath = path.join(workspaceFolder.uri.fsPath, relativePath);
        
        try {
            await vscode.workspace.fs.stat(vscode.Uri.file(fullPath));
            return fullPath;
        } catch {
            this.log(`File not found: ${fullPath}`);
            return null;
        }
    }

    private async createBranch(branchName: string): Promise<void> {
        try {
            // Check if branch already exists
            const branches = await this.git.branchLocal();
            if (branches.all.includes(branchName)) {
                this.log(`Branch ${branchName} already exists, switching to it`);
                await this.git.checkout(branchName);
            } else {
                this.log(`Creating new branch: ${branchName}`);
                await this.git.checkoutLocalBranch(branchName);
            }
        } catch (error) {
            this.log(`Error creating branch: ${error}`);
            throw error;
        }
    }

    private async commitChanges(message: string): Promise<void> {
        try {
            await this.git.add('.');
            await this.git.commit(message);
            this.log(`Committed changes: ${message}`);
        } catch (error) {
            this.log(`Error committing changes: ${error}`);
            throw error;
        }
    }

    private async pushBranch(branchName: string): Promise<void> {
        try {
            await this.git.push('origin', branchName);
            this.log(`Pushed branch: ${branchName}`);
        } catch (error) {
            this.log(`Error pushing branch: ${error}`);
            throw error;
        }
    }

    private async fixIssueWithCopilot(filePath: string, issue: SonarIssue): Promise<boolean> {
        try {
            this.log(`Attempting to fix issue: ${issue.message} in ${filePath}`);
            
            const document = await vscode.workspace.openTextDocument(filePath);
            const editor = await vscode.window.showTextDocument(document);

            const lineNumber = (issue.line || 1) - 1; // Convert to 0-based index
            const position = new vscode.Position(Math.max(0, lineNumber), 0);
            
            // Select the problematic line
            const line = document.lineAt(lineNumber);
            const range = new vscode.Range(position, line.range.end);
            editor.selection = new vscode.Selection(range.start, range.end);

            // Create a detailed prompt for Copilot
            const prompt = `Fix this SonarQube issue:
Rule: ${issue.rule}
Severity: ${issue.severity}
Issue: ${issue.message}
Type: ${issue.type}

Please fix the code to resolve this SonarQube violation while maintaining the original functionality.`;

            // Try to invoke Copilot Chat using available commands
            try {
                // First, try to open Copilot Chat
                await vscode.commands.executeCommand('github.copilot-chat.fix');
                
                // Wait a moment for chat to open
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Send prompt to chat
                await vscode.commands.executeCommand('github.copilot-chat.sendChatMessage', prompt);
                
                this.log(`Sent prompt to Copilot Chat for issue: ${issue.key}`);
                
                // Show user message and wait for manual confirmation
                const userAction = await vscode.window.showInformationMessage(
                    `Copilot Chat opened with fix suggestion for: ${issue.message}. Please review and apply the fix, then click "Applied" to continue.`,
                    'Applied', 
                    'Skip', 
                    'Cancel'
                );
                
                if (userAction === 'Applied') {
                    this.log(`User confirmed fix applied for issue: ${issue.key}`);
                    return true;
                } else if (userAction === 'Cancel') {
                    throw new Error('User cancelled the auto-fix process');
                } else {
                    this.log(`User skipped fix for issue: ${issue.key}`);
                    return false;
                }
                
            } catch (copilotError) {
                this.log(`Copilot Chat command failed: ${copilotError}`);
                
                // Fallback: Show manual fix suggestion
                const manualAction = await vscode.window.showInformationMessage(
                    `Unable to use Copilot Chat. Manual fix needed for: ${issue.message}\n\nRule: ${issue.rule}\nFile: ${filePath}:${issue.line}\n\nPlease fix manually and click "Fixed" to continue.`,
                    'Fixed',
                    'Skip',
                    'Cancel'
                );
                
                if (manualAction === 'Fixed') {
                    this.log(`Manual fix confirmed for issue: ${issue.key}`);
                    return true;
                } else if (manualAction === 'Cancel') {
                    throw new Error('User cancelled the auto-fix process');
                } else {
                    this.log(`User skipped manual fix for issue: ${issue.key}`);
                    return false;
                }
            }
        } catch (error) {
            this.log(`Error fixing issue with Copilot: ${error}`);
            return false;
        }
    }

    async autoFixAllIssues(): Promise<void> {
        try {
            // Check if Copilot is available
            const copilotAvailable = await this.checkCopilotAvailability();
            
            const branchName = this.config.get<string>('gitBranch') || 'sonar-auto-fix';
            
            // Create a new branch for fixes
            await this.createBranch(branchName);
            
            // Fetch issues from SonarQube
            const issues = await this.fetchSonarIssues();
            
            if (issues.length === 0) {
                vscode.window.showInformationMessage('No SonarQube issues found!');
                return;
            }

            let fixedCount = 0;
            let totalIssues = issues.length;

            if (!copilotAvailable) {
                vscode.window.showInformationMessage(
                    `Found ${totalIssues} issues. Will open each file for manual fixing since Copilot Chat is not available.`
                );
            }

            // Process issues one by one
            for (const issue of issues) {
                const filePath = await this.getFilePathFromComponent(issue.component);
                
                if (!filePath) {
                    this.log(`Skipping issue ${issue.key}: file not found`);
                    continue;
                }

                const fixed = await this.fixIssueWithCopilot(filePath, issue);
                
                if (fixed) {
                    fixedCount++;
                    
                    // Commit each fix individually
                    await this.commitChanges(`Fix SonarQube issue: ${issue.message} (${issue.key})`);
                    
                    // Show progress
                    vscode.window.showInformationMessage(
                        `Fixed ${fixedCount}/${totalIssues} issues`
                    );
                }

                // Small delay between fixes to avoid overwhelming the system
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            if (fixedCount > 0) {
                // Push the branch
                await this.pushBranch(branchName);
                
                // Show completion message with PR creation instructions
                const createPR = await vscode.window.showInformationMessage(
                    `Fixed ${fixedCount} SonarQube issues and pushed to branch '${branchName}'. Would you like to create a pull request?`,
                    'Create PR',
                    'Not now'
                );

                if (createPR === 'Create PR') {
                    await this.createPullRequest(branchName);
                }
            } else {
                vscode.window.showWarningMessage('No issues could be fixed automatically');
            }

        } catch (error) {
            this.log(`Error in auto-fix process: ${error}`);
            vscode.window.showErrorMessage(`Auto-fix failed: ${error}`);
        }
    }

    private async createPullRequest(branchName: string): Promise<void> {
        try {
            // Get the repository URL
            const remotes = await this.git.getRemotes(true);
            const originRemote = remotes.find(remote => remote.name === 'origin');
            
            if (!originRemote) {
                throw new Error('No origin remote found');
            }

            // Extract repository info from remote URL
            const repoUrl = originRemote.refs.fetch;
            const match = repoUrl.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
            
            if (!match) {
                throw new Error('Could not parse GitHub repository URL');
            }

            const [, owner, repo] = match;
            const prUrl = `https://github.com/${owner}/${repo}/compare/${branchName}?expand=1`;
            
            // Open GitHub PR creation page
            await vscode.env.openExternal(vscode.Uri.parse(prUrl));
            
            this.log(`Opened PR creation page: ${prUrl}`);
            
        } catch (error) {
            this.log(`Error creating PR: ${error}`);
            vscode.window.showErrorMessage(`Failed to create PR: ${error}`);
        }
    }

    async configureSonar(): Promise<void> {
        try {
            const sonarUrl = await vscode.window.showInputBox({
                prompt: 'Enter SonarQube server URL',
                value: this.config.get<string>('sonarUrl') || 'http://localhost:9000',
                placeHolder: 'http://localhost:9000'
            });

            if (!sonarUrl) {
                return;
            }

            const sonarToken = await vscode.window.showInputBox({
                prompt: 'Enter SonarQube authentication token',
                password: true,
                placeHolder: 'sqp_...'
            });

            if (!sonarToken) {
                return;
            }

            const projectKey = await vscode.window.showInputBox({
                prompt: 'Enter SonarQube project key',
                placeHolder: 'my-project-key'
            });

            if (!projectKey) {
                return;
            }

            const branchName = await vscode.window.showInputBox({
                prompt: 'Enter branch name for auto-fixes',
                value: this.config.get<string>('gitBranch') || 'sonar-auto-fix',
                placeHolder: 'sonar-auto-fix'
            });

            if (!branchName) {
                return;
            }

            // Save configuration
            await this.config.update('sonarUrl', sonarUrl, vscode.ConfigurationTarget.Workspace);
            await this.config.update('sonarToken', sonarToken, vscode.ConfigurationTarget.Workspace);
            await this.config.update('projectKey', projectKey, vscode.ConfigurationTarget.Workspace);
            await this.config.update('gitBranch', branchName, vscode.ConfigurationTarget.Workspace);

            vscode.window.showInformationMessage('SonarQube configuration saved successfully!');
            
        } catch (error) {
            this.log(`Error configuring SonarQube: ${error}`);
            vscode.window.showErrorMessage(`Configuration failed: ${error}`);
        }
    }

    async getCopilotCommands(): Promise<string[]> {
        try {
            const allCommands = await vscode.commands.getCommands();
            const copilotCommands = allCommands.filter(cmd => cmd.startsWith('github.copilot'));
            this.log(`Available Copilot commands: ${copilotCommands.join(', ')}`);
            return copilotCommands;
        } catch (error) {
            this.log(`Error getting Copilot commands: ${error}`);
            return [];
        }
    }

    private async checkCopilotAvailability(): Promise<boolean> {
        const copilotCommands = await this.getCopilotCommands();
        const hasCopilotChat = copilotCommands.some(cmd => cmd.includes('github.copilot.chat.fix'));
        
        if (!hasCopilotChat) {
            const install = await vscode.window.showWarningMessage(
                'GitHub Copilot Chat is not installed or not available. This extension requires Copilot Chat to automatically fix issues.',
                'Install Copilot Chat',
                'Continue without Copilot'
            );
            
            if (install === 'Install Copilot Chat') {
                await vscode.commands.executeCommand('workbench.extensions.search', 'GitHub.copilot-chat');
                return false;
            }
        }
        
        return hasCopilotChat;
    }

    async installCopilotChat(): Promise<void> {
        try {
            const install = await vscode.window.showInformationMessage(
                'This extension requires GitHub Copilot Chat to automatically fix SonarQube issues. Would you like to install it?',
                'Install Now',
                'Learn More',
                'Cancel'
            );

            if (install === 'Install Now') {
                await vscode.commands.executeCommand('workbench.extensions.search', 'GitHub.copilot-chat');
                vscode.window.showInformationMessage('Please install GitHub Copilot Chat from the Extensions marketplace, then restart VS Code.');
            } else if (install === 'Learn More') {
                await vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat'));
            }
        } catch (error) {
            this.log(`Error installing Copilot Chat: ${error}`);
            vscode.window.showErrorMessage(`Failed to open Extensions marketplace: ${error}`);
        }
    }
}

interface ChatRequest {
    prompt: string;
    command?: string;
    references: vscode.ChatPromptReference[];
}

interface ChatResponse {
    markdown(value: string): void;
    filetree(value: vscode.ChatResponseFileTree[], baseUri?: vscode.Uri): void;
    progress(value: string): void;
}

class SonarChatParticipant {
    private sonarAutoFix: SonarAutoFix;
    private outputChannel: vscode.OutputChannel;

    constructor() {
        this.sonarAutoFix = new SonarAutoFix();
        this.outputChannel = vscode.window.createOutputChannel('SonarQube Chat Agent');
    }

    private log(message: string) {
        this.outputChannel.appendLine(`[${new Date().toISOString()}] ${message}`);
        console.log(message);
    }

    async handleChatRequest(
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        try {
            this.log(`Received chat request: ${request.prompt}`);
            
            // Handle slash commands
            if (request.command) {
                await this.handleSlashCommand(request.command, request, stream, token);
                return;
            }
            
            // Parse the user's request
            const prompt = request.prompt.toLowerCase();
            
            if (prompt.includes('fetch') || prompt.includes('list') || prompt.includes('issues')) {
                await this.handleFetchIssues(request, stream, token);
            } else if (prompt.includes('fix') && prompt.includes('issue')) {
                await this.handleFixIssue(request, stream, token);
            } else if (prompt.includes('config') || prompt.includes('setup')) {
                await this.handleConfiguration(request, stream, token);
            } else if (prompt.includes('help')) {
                await this.handleHelp(request, stream, token);
            } else {
                await this.handleGeneral(request, stream, token);
            }
        } catch (error) {
            this.log(`Error in chat request: ${error}`);
            stream.markdown(`❌ **Error**: ${error}`);
        }
    }

    private async handleSlashCommand(
        command: string,
        request: vscode.ChatRequest,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        switch (command) {
            case 'help':
                await this.handleHelp(request, stream, token);
                break;
            case 'config':
                await this.handleConfiguration(request, stream, token);
                break;
            case 'fetch':
                await this.handleFetchIssues(request, stream, token);
                break;
            case 'fix-all':
                await this.handleFixAllIssues(stream, token);
                break;
            case 'analyze':
                await this.handleAnalyzeIssues(request, stream, token);
                break;
            default:
                stream.markdown(`❌ **Unknown command**: \`/${command}\`\n\nUse \`@sonar-agent /help\` to see available commands.`);
        }
    }

    private async handleAnalyzeIssues(
        request: vscode.ChatRequest,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        stream.progress('Analyzing SonarQube issues...');
        
        try {
            const issues = await this.sonarAutoFix.fetchSonarIssues();
            
            if (issues.length === 0) {
                stream.markdown('✅ **No SonarQube issues found!** Your code is clean.');
                return;
            }

            stream.markdown(`## 📊 SonarQube Issues Analysis\n`);
            
            // Group issues by severity
            const groupedIssues = issues.reduce((acc, issue) => {
                if (!acc[issue.severity]) {
                    acc[issue.severity] = [];
                }
                acc[issue.severity].push(issue);
                return acc;
            }, {} as Record<string, SonarIssue[]>);

            // Group issues by type
            const groupedByType = issues.reduce((acc, issue) => {
                if (!acc[issue.type]) {
                    acc[issue.type] = [];
                }
                acc[issue.type].push(issue);
                return acc;
            }, {} as Record<string, SonarIssue[]>);

            // Calculate statistics
            const totalIssues = issues.length;
            const severityStats = Object.entries(groupedIssues).map(([severity, issueList]) => ({
                severity,
                count: issueList.length,
                percentage: Math.round((issueList.length / totalIssues) * 100)
            }));

            const typeStats = Object.entries(groupedByType).map(([type, issueList]) => ({
                type,
                count: issueList.length,
                percentage: Math.round((issueList.length / totalIssues) * 100)
            }));

            // Display severity breakdown
            stream.markdown(`### 🎯 **Severity Breakdown**\n`);
            for (const stat of severityStats) {
                const emoji = stat.severity === 'BLOCKER' ? '🚨' : 
                             stat.severity === 'CRITICAL' ? '❗' : 
                             stat.severity === 'MAJOR' ? '⚠️' : 
                             stat.severity === 'MINOR' ? '💡' : 'ℹ️';
                stream.markdown(`- ${emoji} **${stat.severity}**: ${stat.count} issues (${stat.percentage}%)\n`);
            }

            // Display type breakdown
            stream.markdown(`\n### 🔍 **Issue Type Breakdown**\n`);
            for (const stat of typeStats) {
                const emoji = stat.type === 'BUG' ? '🐛' : 
                             stat.type === 'VULNERABILITY' ? '🔒' : 
                             stat.type === 'CODE_SMELL' ? '💨' : '📝';
                stream.markdown(`- ${emoji} **${stat.type}**: ${stat.count} issues (${stat.percentage}%)\n`);
            }

            // Most common rules
            const ruleCount = issues.reduce((acc, issue) => {
                acc[issue.rule] = (acc[issue.rule] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const topRules = Object.entries(ruleCount)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5);

            stream.markdown(`\n### 📋 **Top 5 Most Common Rules**\n`);
            topRules.forEach(([rule, count], index) => {
                stream.markdown(`${index + 1}. \`${rule}\` - ${count} occurrences\n`);
            });

            // Recommendations
            stream.markdown(`\n### 💡 **Recommendations**\n`);
            if (groupedIssues.BLOCKER?.length > 0) {
                stream.markdown(`- 🚨 **Priority**: Fix ${groupedIssues.BLOCKER.length} blocker issues first\n`);
            }
            if (groupedIssues.CRITICAL?.length > 0) {
                stream.markdown(`- ❗ **High Priority**: Address ${groupedIssues.CRITICAL.length} critical issues\n`);
            }
            if (groupedByType.VULNERABILITY?.length > 0) {
                stream.markdown(`- 🔒 **Security**: Review ${groupedByType.VULNERABILITY.length} security vulnerabilities\n`);
            }
            
            stream.markdown(`\n**Next Steps:**\n`);
            stream.markdown(`- Use \`@sonar-agent /fix-all\` to start fixing issues automatically\n`);
            stream.markdown(`- Use \`@sonar-agent /fetch\` to see detailed issue list\n`);
            
        } catch (error) {
            stream.markdown(`❌ **Error analyzing issues**: ${error}\n\n💡 Make sure your SonarQube configuration is correct.`);
        }
    }

    private async handleFetchIssues(
        request: vscode.ChatRequest,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        stream.progress('Fetching SonarQube issues...');
        
        try {
            const issues = await this.sonarAutoFix.fetchSonarIssues();
            
            if (issues.length === 0) {
                stream.markdown('✅ **No SonarQube issues found!** Your code is clean.');
                return;
            }

            stream.markdown(`## 🔍 Found ${issues.length} SonarQube Issues\n`);
            
            // Group issues by severity
            const groupedIssues = issues.reduce((acc, issue) => {
                if (!acc[issue.severity]) {
                    acc[issue.severity] = [];
                }
                acc[issue.severity].push(issue);
                return acc;
            }, {} as Record<string, SonarIssue[]>);

            // Display issues by severity
            const severityOrder = ['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO'];
            const severityEmojis: Record<string, string> = {
                'BLOCKER': '🚨',
                'CRITICAL': '❗',
                'MAJOR': '⚠️',
                'MINOR': '💡',
                'INFO': 'ℹ️'
            };

            for (const severity of severityOrder) {
                if (groupedIssues[severity]) {
                    stream.markdown(`### ${severityEmojis[severity]} ${severity} (${groupedIssues[severity].length})\n`);
                    
                    for (const issue of groupedIssues[severity].slice(0, 5)) { // Show first 5 issues per severity
                        const fileName = issue.component.split(':').pop() || 'Unknown';
                        stream.markdown(`- **${fileName}:${issue.line}** - ${issue.message}\n  - Rule: \`${issue.rule}\`\n  - Type: ${issue.type}\n`);
                    }
                    
                    if (groupedIssues[severity].length > 5) {
                        stream.markdown(`  - ... and ${groupedIssues[severity].length - 5} more ${severity} issues\n`);
                    }
                    stream.markdown('\n');
                }
            }

            stream.markdown(`\n💡 **Next steps:**\n- Type \`@sonar-agent fix all issues\` to start fixing them\n- Type \`@sonar-agent fix issue <key>\` to fix a specific issue\n- Type \`@sonar-agent help\` for more options`);
            
        } catch (error) {
            stream.markdown(`❌ **Error fetching issues**: ${error}\n\n💡 Make sure your SonarQube configuration is correct. Type \`@sonar-agent config\` to set it up.`);
        }
    }

    private async handleFixIssue(
        request: vscode.ChatRequest,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        const prompt = request.prompt.toLowerCase();
        
        if (prompt.includes('all')) {
            await this.handleFixAllIssues(stream, token);
        } else {
            // Extract issue key from prompt
            const issueKeyMatch = request.prompt.match(/\b[A-Z]+-\d+\b/);
            if (issueKeyMatch) {
                await this.handleFixSpecificIssue(issueKeyMatch[0], stream, token);
            } else {
                stream.markdown('❌ **Please specify an issue key** (e.g., `@sonar-agent fix issue ABC-123`) or use `@sonar-agent fix all issues`');
            }
        }
    }

    private async handleFixAllIssues(
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        stream.progress('Starting auto-fix process...');
        
        try {
            const issues = await this.sonarAutoFix.fetchSonarIssues();
            
            if (issues.length === 0) {
                stream.markdown('✅ **No issues to fix!** Your code is already clean.');
                return;
            }

            stream.markdown(`## 🔧 Auto-Fix Process Started\n`);
            stream.markdown(`Found ${issues.length} issues to fix. This process will:\n\n`);
            stream.markdown(`1. Create a new Git branch: \`sonar-auto-fix\`\n`);
            stream.markdown(`2. Fix each issue one by one\n`);
            stream.markdown(`3. Commit each fix individually\n`);
            stream.markdown(`4. Push the branch and create a PR\n\n`);
            
            // Start the auto-fix process
            await vscode.commands.executeCommand('jitena.autoFixSonarBugs');
            
            stream.markdown(`🚀 **Auto-fix process initiated!** Check the notifications for progress updates.`);
            
        } catch (error) {
            stream.markdown(`❌ **Error starting auto-fix**: ${error}\n\n💡 Make sure your SonarQube configuration is correct and you have a Git repository initialized.`);
        }
    }

    private async handleFixSpecificIssue(
        issueKey: string,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        stream.progress(`Looking for issue ${issueKey}...`);
        
        try {
            const issues = await this.sonarAutoFix.fetchSonarIssues();
            const issue = issues.find(i => i.key === issueKey);
            
            if (!issue) {
                stream.markdown(`❌ **Issue ${issueKey} not found**. Use \`@sonar-agent fetch issues\` to see available issues.`);
                return;
            }

            stream.markdown(`## 🔍 Issue Details: ${issueKey}\n`);
            stream.markdown(`**File**: ${issue.component.split(':').pop()}\n`);
            stream.markdown(`**Line**: ${issue.line}\n`);
            stream.markdown(`**Rule**: ${issue.rule}\n`);
            stream.markdown(`**Severity**: ${issue.severity}\n`);
            stream.markdown(`**Type**: ${issue.type}\n`);
            stream.markdown(`**Message**: ${issue.message}\n\n`);
            
            // Get file content around the issue
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (workspaceFolder && issue.line) {
                const fileName = issue.component.split(':').pop();
                if (fileName) {
                    const filePath = path.join(workspaceFolder.uri.fsPath, fileName);
                    try {
                        const document = await vscode.workspace.openTextDocument(filePath);
                        const line = document.lineAt(Math.max(0, issue.line - 1));
                        
                        stream.markdown(`**Problematic code:**\n`);
                        stream.markdown(`\`\`\`${document.languageId}\n${line.text.trim()}\n\`\`\`\n\n`);
                        
                        // Generate fix suggestion
                        stream.markdown(`## 💡 Fix Suggestion\n`);
                        stream.markdown(`Based on the SonarQube rule \`${issue.rule}\`, here's how to fix this issue:\n\n`);
                        
                        // You can enhance this with specific rule-based suggestions
                        stream.markdown(`The issue "${issue.message}" can typically be resolved by:\n`);
                        stream.markdown(`1. Reviewing the code at line ${issue.line}\n`);
                        stream.markdown(`2. Applying the SonarQube rule guidelines\n`);
                        stream.markdown(`3. Testing the fix to ensure functionality is preserved\n\n`);
                        
                        stream.markdown(`🔧 **To apply the fix automatically**, I can help you open the file and position your cursor at the problematic line.`);
                        
                        // Open the file at the specific line
                        const editor = await vscode.window.showTextDocument(document);
                        const position = new vscode.Position(Math.max(0, issue.line - 1), 0);
                        editor.selection = new vscode.Selection(position, position);
                        editor.revealRange(new vscode.Range(position, position));
                        
                    } catch (fileError) {
                        stream.markdown(`❌ **Could not open file**: ${fileError}`);
                    }
                }
            }
            
        } catch (error) {
            stream.markdown(`❌ **Error fetching issue details**: ${error}`);
        }
    }

    private async handleConfiguration(
        request: vscode.ChatRequest,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        stream.markdown(`## ⚙️ SonarQube Configuration\n`);
        stream.markdown(`To use the SonarQube agent, you need to configure the following settings:\n\n`);
        
        const config = vscode.workspace.getConfiguration('sonarAutoFix');
        const sonarUrl = config.get<string>('sonarUrl');
        const sonarToken = config.get<string>('sonarToken');
        const projectKey = config.get<string>('projectKey');
        
        stream.markdown(`**Current Configuration:**\n`);
        stream.markdown(`- SonarQube URL: ${sonarUrl || '❌ Not configured'}\n`);
        stream.markdown(`- Authentication Token: ${sonarToken ? '✅ Configured' : '❌ Not configured'}\n`);
        stream.markdown(`- Project Key: ${projectKey || '❌ Not configured'}\n\n`);
        
        stream.markdown(`**To configure:**\n`);
        stream.markdown(`1. Open Command Palette (\`Ctrl+Shift+P\`)\n`);
        stream.markdown(`2. Run \`Configure SonarQube Settings\`\n`);
        stream.markdown(`3. Enter your SonarQube server details\n\n`);
        
        stream.markdown(`**Or manually add to your settings.json:**\n`);
        stream.markdown(`\`\`\`json\n`);
        stream.markdown(`{\n`);
        stream.markdown(`  "sonarAutoFix.sonarUrl": "http://localhost:9000",\n`);
        stream.markdown(`  "sonarAutoFix.sonarToken": "your-token-here",\n`);
        stream.markdown(`  "sonarAutoFix.projectKey": "your-project-key"\n`);
        stream.markdown(`}\n`);
        stream.markdown(`\`\`\`\n\n`);
        
        if (!sonarUrl || !sonarToken || !projectKey) {
            stream.markdown(`🚀 **Quick Setup**: I can help you configure this now!`);
            await vscode.commands.executeCommand('jitena.configureSonar');
        }
    }

    private async handleHelp(
        request: vscode.ChatRequest,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        stream.markdown(`## 🤖 SonarQube Agent Help\n`);
        stream.markdown(`I'm your AI assistant for managing SonarQube issues. Here's what I can do:\n\n`);
        
        stream.markdown(`### 🔍 **Fetch Issues**\n`);
        stream.markdown(`- \`@sonar-agent fetch issues\` - List all SonarQube issues\n`);
        stream.markdown(`- \`@sonar-agent list issues\` - Same as above\n`);
        stream.markdown(`- \`@sonar-agent show issues\` - Same as above\n\n`);
        
        stream.markdown(`### 🔧 **Fix Issues**\n`);
        stream.markdown(`- \`@sonar-agent fix all issues\` - Start auto-fix process for all issues\n`);
        stream.markdown(`- \`@sonar-agent fix issue ABC-123\` - Fix a specific issue by key\n`);
        stream.markdown(`- \`@sonar-agent fix this issue\` - Fix the currently selected issue\n\n`);
        
        stream.markdown(`### ⚙️ **Configuration**\n`);
        stream.markdown(`- \`@sonar-agent config\` - Configure SonarQube settings\n`);
        stream.markdown(`- \`@sonar-agent setup\` - Same as above\n`);
        stream.markdown(`- \`@sonar-agent check config\` - Verify current configuration\n\n`);
        
        stream.markdown(`### 📊 **Analysis**\n`);
        stream.markdown(`- \`@sonar-agent analyze issues\` - Get detailed analysis of issues\n`);
        stream.markdown(`- \`@sonar-agent statistics\` - Show issue statistics\n\n`);
        
        stream.markdown(`### 💡 **Tips**\n`);
        stream.markdown(`- Make sure your SonarQube server is running and accessible\n`);
        stream.markdown(`- Ensure you have a valid authentication token\n`);
        stream.markdown(`- Your project must be analyzed by SonarQube to see issues\n`);
        stream.markdown(`- Git repository is required for auto-fix functionality\n\n`);
        
        stream.markdown(`### 🆘 **Need Help?**\n`);
        stream.markdown(`If you're having trouble, try:\n`);
        stream.markdown(`1. \`@sonar-agent config\` - Check your configuration\n`);
        stream.markdown(`2. \`@sonar-agent fetch issues\` - Test the connection\n`);
        stream.markdown(`3. Check the SonarQube Auto-Fix output channel for detailed logs\n`);
    }

    private async handleGeneral(
        request: vscode.ChatRequest,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        stream.markdown(`## 🤖 SonarQube Agent\n`);
        stream.markdown(`I'm here to help you manage SonarQube issues! Here are some things you can ask me:\n\n`);
        
        stream.markdown(`- "Fetch issues" or "List issues" - Show all SonarQube issues\n`);
        stream.markdown(`- "Fix all issues" - Start the auto-fix process\n`);
        stream.markdown(`- "Fix issue ABC-123" - Fix a specific issue\n`);
        stream.markdown(`- "Config" or "Setup" - Configure SonarQube settings\n`);
        stream.markdown(`- "Help" - Show detailed help\n\n`);
        
        stream.markdown(`💡 **Tip**: Type \`@sonar-agent help\` to see all available commands!`);
    }

    provideFollowups(
        result: vscode.ChatResult,
        context: vscode.ChatContext,
        token: vscode.CancellationToken
    ): vscode.ChatFollowup[] | Promise<vscode.ChatFollowup[]> {
        const followups: vscode.ChatFollowup[] = [];

        // Provide contextual follow-ups based on the last interaction
        if (context.history.length > 0) {
            const lastMessage = context.history[context.history.length - 1];
            
            if (lastMessage.participant === 'sonar-agent' && 'prompt' in lastMessage) {
                const lastPrompt = lastMessage.prompt.toLowerCase();
                
                if (lastPrompt.includes('help')) {
                    followups.push(
                        {
                            prompt: '@sonar-agent /config',
                            label: '⚙️ Configure SonarQube',
                            command: 'config'
                        },
                        {
                            prompt: '@sonar-agent /fetch',
                            label: '🔍 Fetch Issues',
                            command: 'fetch'
                        }
                    );
                } else if (lastPrompt.includes('config')) {
                    followups.push(
                        {
                            prompt: '@sonar-agent /fetch',
                            label: '🔍 Test Connection',
                            command: 'fetch'
                        }
                    );
                } else if (lastPrompt.includes('fetch') || lastPrompt.includes('issues')) {
                    followups.push(
                        {
                            prompt: '@sonar-agent /fix-all',
                            label: '🔧 Fix All Issues',
                            command: 'fix-all'
                        },
                        {
                            prompt: '@sonar-agent /analyze',
                            label: '📊 Analyze Issues',
                            command: 'analyze'
                        }
                    );
                } else if (lastPrompt.includes('fix')) {
                    followups.push(
                        {
                            prompt: '@sonar-agent /fetch',
                            label: '🔄 Refresh Issues',
                            command: 'fetch'
                        }
                    );
                }
            }
        }

        // Always provide common follow-ups
        if (followups.length === 0) {
            followups.push(
                {
                    prompt: '@sonar-agent /help',
                    label: '❓ Help',
                    command: 'help'
                },
                {
                    prompt: '@sonar-agent /config',
                    label: '⚙️ Configure',
                    command: 'config'
                },
                {
                    prompt: '@sonar-agent /fetch',
                    label: '🔍 Fetch Issues',
                    command: 'fetch'
                }
            );
        }

        return followups;
    }
}


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    console.log('SonarQube Auto-Fix extension is now active!');
    
    try {
        // Register the chat participant with agent mode support
        const sonarChatParticipant = new SonarChatParticipant();
        const chatParticipant = vscode.chat.createChatParticipant('sonar-agent', sonarChatParticipant.handleChatRequest.bind(sonarChatParticipant));
        chatParticipant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'icon.svg');
        
        // Enable agent mode by providing followup suggestions
        chatParticipant.followupProvider = {
            provideFollowups(result: vscode.ChatResult, context: vscode.ChatContext, token: vscode.CancellationToken) {
                return sonarChatParticipant.provideFollowups(result, context, token);
            }
        };
        
        console.log('Chat participant registered successfully:', chatParticipant);
        
        // Register the auto-fix command
        const autoFixCommand = vscode.commands.registerCommand('jitena.autoFixSonarBugs', async () => {
            try {
                const sonarAutoFix = new SonarAutoFix();
                await sonarAutoFix.autoFixAllIssues();
            } catch (error) {
                vscode.window.showErrorMessage(`Auto-fix failed: ${error}`);
            }
        });

        // Register the configuration command
        const configureCommand = vscode.commands.registerCommand('jitena.configureSonar', async () => {
            try {
                const sonarAutoFix = new SonarAutoFix();
                await sonarAutoFix.configureSonar();
            } catch (error) {
                vscode.window.showErrorMessage(`Configuration failed: ${error}`);
            }
        });

        // Register the Copilot check command
        const checkCopilotCommand = vscode.commands.registerCommand('jitena.checkCopilot', async () => {
            try {
                const sonarAutoFix = new SonarAutoFix();
                const copilotCommands = await sonarAutoFix.getCopilotCommands();
                
                if (copilotCommands.length === 0) {
                    vscode.window.showWarningMessage('No GitHub Copilot commands found. Please install GitHub Copilot and Copilot Chat extensions.');
                    await sonarAutoFix.installCopilotChat();
                } else {
                    vscode.window.showInformationMessage(`Found ${copilotCommands.length} Copilot commands. Extension is ready to use!`);
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Copilot check failed: ${error}`);
            }
        });

        // Add a test command to verify chat participant registration
        const testChatCommand = vscode.commands.registerCommand('jitena.testChatParticipant', async () => {
            try {
                // Check if chat API is available
                if (vscode.chat) {
                    vscode.window.showInformationMessage('✅ Chat API is available! Chat participant should be registered.');
                } else {
                    vscode.window.showErrorMessage('❌ Chat API is not available. This might be a VS Code version issue.');
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Chat participant test failed: ${error}`);
            }
        });

        context.subscriptions.push(chatParticipant, autoFixCommand, configureCommand, checkCopilotCommand, testChatCommand);
        
        // Show a notification that the extension is ready
        vscode.window.showInformationMessage('SonarQube Auto-Fix extension loaded! Chat participant @sonar-agent is ready.');
        
    } catch (error) {
        console.error('Error activating extension:', error);
        vscode.window.showErrorMessage(`Failed to activate SonarQube Auto-Fix extension: ${error}`);
    }
}

// This method is called when your extension is deactivated
export function deactivate() {}