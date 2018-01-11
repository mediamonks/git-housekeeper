import inquirer from 'inquirer';
import { getBranches } from '../git/branches';
import reviewRemoteBranches from './reviewRemoteBranches';
import reviewGoneBranches from './reviewGoneBranches';

async function mainMenu(argv) {
  const branches = await getBranches();
  const goneBranches = branches.locals.filter(branch => branch.gone);
  const remoteBranches = branches.remotes.filter(branch => branch.onTargetRemote);

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      choices: [
        {
          value: () => reviewRemoteBranches(),
          name: `review branches on remote (${remoteBranches.length})`,
        },
        {
          value: () => reviewGoneBranches(),
          name: `review tracking branches gone on remote (${goneBranches.length})`,
        },
        {
          value: null,
          name: 'exit',
        },
      ],
      name: 'action',
      message: '[main menu] What would you like to do?',
    },
  ]);

  if (action) {
    const shouldContinue = await action();
    if (shouldContinue) {
      await mainMenu(argv);
    }
  }
}

export default mainMenu;
