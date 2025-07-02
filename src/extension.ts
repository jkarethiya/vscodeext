// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import axios from 'axios';


const SONAR_BASE_URL = 'http://localhost:9000';
const SONAR_TOKEN = 'sqp_41345b81ffd02fd1b33c21abffeccc835881ffb1';


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "jitena" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('jitena.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user

		axios.get(`${SONAR_BASE_URL}/api/issues/search`, {
			params: { types: 'BUG', resolved: false, severities: 'BLOCKER' },
			headers: {
    			Authorization: `Bearer ${SONAR_TOKEN}`
  		}
		})
		.then(async response => {
			console.log("Response from SonarQube:", response.data);
			vscode.window.showInformationMessage("SonarQube issues fetched successfully!");

			const issues = response.data.issues;
			if (!issues.length) {
				vscode.window.showInformationMessage('No Sonar bugs found.');
				return;
			}

			 for (const issue of issues) {
				const description = issue.message;
				const component = issue.component;
				const filePath = component.substring(component.indexOf(':') + 1);

				console.log("description:" + description);
				console.log("component:" + component);
				console.log("filePath:" + filePath);

				// Step 3: Ask Copilot to fix the bug (if file is in workspace)
				const fullPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/' + filePath;
				await invokeCopilotToFixBug(fullPath, issue.line || 0);
			}
		})
		.catch(error => {
			console.error("Error fetching SonarQube issues:", error);
			vscode.window.showErrorMessage("Failed to fetch SonarQube issues.");
		});

	context.subscriptions.push(disposable);
	});

}

async function invokeCopilotToFixBug(filePath: string, lineNumber: number) {
	const document = await vscode.workspace.openTextDocument(filePath);
	const editor = await vscode.window.showTextDocument(document);

	const position = new vscode.Position(lineNumber, 0);
	editor.selection = new vscode.Selection(position, position);

	// Simulate user asking Copilot to fix a bug
	await vscode.commands.executeCommand(
	'github.copilot-chat.inline.chat',
	{
	prompt: "Fix this Sonar-reported bug.",
	position,
	autoSend: true
	}
	);
}