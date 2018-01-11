import inquirer from 'inquirer';
import { DEFAULT_BASE_BRANCHES, INQUIRER_PAGE_SIZE } from '../const';
import { getBranches } from '../git/branches';
import reviewRemoteGoogleSheets from './reviewRemoteGoogleSheets';
import reviewRemoteInteractive from './reviewRemoteInteractive';

async function selectBaseBranch(remoteBranches) {
  const choices = remoteBranches.map(branch => branch.shortName);
  // make sure the default branches are listed first
  DEFAULT_BASE_BRANCHES.forEach(branchName => {
    const choiceIndex = choices.indexOf(branchName);
    if (choiceIndex > 0) {
      choices.splice(choiceIndex, 1);
      choices.unshift(branchName);
    }
  });

  const { baseBranch } = await inquirer.prompt([
    {
      name: 'baseBranch',
      message: `[review remote] Please select a base branch`,
      type: 'list',
      choices,
    },
  ]);

  return baseBranch;
}

async function reviewRemoteBranches(noDefaultBase = false) {
  const { remotes: remoteBranches } = await getBranches();

  let baseBranch = noDefaultBase
    ? null
    : DEFAULT_BASE_BRANCHES.find(branchName =>
        remoteBranches.some(branch => branch.name.endsWith(branchName)),
      );

  if (!baseBranch) {
    baseBranch = await selectBaseBranch(remoteBranches);
  }
  console.log(`Using "${baseBranch}" as base branch`);

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      pageSize: INQUIRER_PAGE_SIZE,
      choices: [
        {
          value: () => reviewRemoteGoogleSheets(baseBranch),
          name: 'review branches collaboratively using Google Sheets',
        },
        {
          value: () => reviewRemoteInteractive(baseBranch),
          name: 'ask me which branches I would like to keep',
        },
        {
          value: () => reviewRemoteBranches(true),
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
