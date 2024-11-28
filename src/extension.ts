import * as vscode from "vscode";
import * as child_process from "child_process";
import * as process from "process";

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "lazygit.openLazygit",
    openLazygit
  );

  context.subscriptions.push(disposable);
}

async function openLazygit() {
  if (!(await focusActiveLazygitInstance())) {
    await newLazygitInstance();
  }
}

/**
 * Tries to find an instance and focus on the tab.
 * @returns If an instance was found and focused
 */
async function focusActiveLazygitInstance(): Promise<boolean> {
  for (let openTerminal of vscode.window.terminals) {
    if (openTerminal.name === "lazygit") {
      openTerminal.show();
      return true;
    }
  }
  return false;
}

// Function to detect shell and check if the HISTIGNORE_SPACE option is enabled
function shouldPrependSpace() {
  // Detect shell type
  const shell = process.env.SHELL;

  try {
    if (shell?.endsWith("zsh")) {
      // Check for histignorespace in zsh
      const result = child_process
        .execSync("/bin/zsh -c 'source ~/.zshrc; setopt'")
        .toString();
      return result.includes("histignorespace");
    } else if (shell?.endsWith("bash")) {
      // Check if HISTCONTROL includes ignorespace in bash
      const result = child_process
        .execSync("/bin/bash -c 'source ~/.bashrc; echo $HISTCONTROL'")
        .toString();
      return result.includes("ignorespace");
    }
  } catch (error) {
    console.error(error);
  }
  return false; // Default to no space if detection fails
}

async function newLazygitInstance() {
  // Always create a new terminal
  await vscode.commands.executeCommand(
    "workbench.action.terminal.newInActiveWorkspace"
  );

  let terminal = vscode.window.activeTerminal!;
  // Use the check and send the command
  const prependSpace = shouldPrependSpace();
  let command = "lazygit && exit";
  if (prependSpace) {
    command = ` ${command}`; // Prepend space if the option is enabled
  }
  terminal.sendText(command);
  terminal.show();

  // Move the terminal to the editor area
  await vscode.commands.executeCommand(
    "workbench.action.terminal.moveToEditor"
  );

  // Move focus back to the editor view
  await vscode.commands.executeCommand(
    "workbench.action.focusActiveEditorGroup"
  );

  if (vscode.window.terminals.length > 1) {
    const config = vscode.workspace.getConfiguration("lazygit");
    const closeTerminalOnMultiple = config.get<boolean>(
      "closeTerminalOnMultiple",
      false
    );
    if (closeTerminalOnMultiple) {
      // Close the terminal if the option is enabled
      await vscode.commands.executeCommand("workbench.action.togglePanel");
    }
  }
}

export function deactivate() {}
