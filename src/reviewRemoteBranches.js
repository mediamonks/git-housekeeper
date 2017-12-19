import inquirer from 'inquirer';
import reviewRemoteInteractive from './reviewRemoteInteractive';
import reviewGoogleSheets from './sheets/reviewRemoteGoogleSheets';

const DEFAULT_BASE_BRANCHES = ['develop', 'master'];
let baseBranch = null;

async function selectBaseBranch(remoteBranches) {
  const choices = remoteBranches.map(branch => branch.shorthand.replace(/^.+?\//, ''));
  // make sure the default branches are listed first
  DEFAULT_BASE_BRANCHES.forEach(branchName => {
    const choiceIndex = choices.indexOf(branchName);
    if (choiceIndex > 0) {
      choices.splice(choiceIndex, 1);
      choices.unshift(branchName);
    }
  });

  ({ baseBranch } = await inquirer.prompt([
    {
      name: 'baseBranch',
      message: `[review remote] Please select a base branch`,
      type: 'list',
      choices,
    },
  ]));
}

async function reviewRemoteBranches(argv, remoteBranches, noDefaultBase = false) {
  baseBranch = noDefaultBase
    ? null
    : DEFAULT_BASE_BRANCHES.find(branchName =>
        remoteBranches.some(branch => branch.name.endsWith(branchName)),
      );

  if (!baseBranch) {
    await selectBaseBranch(remoteBranches);
  }
  console.log(`Using "${baseBranch}" as base branch`);

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      choices: [
        {
          value: () => reviewGoogleSheets(argv, remoteBranches, baseBranch),
          name: 'review branches collaboratively using Google Sheets',
        },
        {
          value: () => reviewRemoteInteractive(argv, remoteBranches, baseBranch),
          name: 'ask me which branches I would like to keep',
        },
        {
          value: () => reviewRemoteBranches(argv, remoteBranches, true),
          name: 'select a different base branch',
        },
        {
          value: null,
          name: 'return to main menu',
        },
      ],
      name: 'action',
      message: '[review remote] What would you like to do?',
    },
  ]);

  if (!action) {
    return true;
  }

  return action();
}

export default reviewRemoteBranches;
