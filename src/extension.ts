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


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    console.log('SonarQube Auto-Fix extension is now active!');

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

    context.subscriptions.push(autoFixCommand, configureCommand, checkCopilotCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}