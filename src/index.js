import yargs from 'yargs';
import path from 'path';
import inquirer from 'inquirer';
import { openRepository, fetchRemote, getBranches } from './git';

const { argv } = yargs
  .usage('$0 <path>', 'starts branch cleanup for the given repository', y => {
    y.positional('path', {
      describe: 'the path to the repository to analyse',
      type: 'string',
    });
  })
  .options({
    d: {
      alias: 'dry-mode',
      default: false,
      describe: "Runs in dry mode (won't remove any branches)",
      type: 'boolean',
    },
  })
  .help();

let branches;

async function mainMenu() {
  const goneBranches = branches.locals.filter(branch => branch.gone);
  const remoteBranches = branches.remotes.filter(
    branch =>
      branch.onTargetRemote &&
      !['master', 'develop'].some(branchName => branch.name.endsWith(branchName)),
  );

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      choices: [
        {
          value: 2,
          name: `review branches on remote (${remoteBranches.length})`,
        },
        {
          value: 1,
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
    await action();
    await mainMenu();
  }
}

(async function main() {
  console.log('\n\n Welcome to git housekeeper! \n\n');
  const repositoryPath = path.resolve(argv.path);
  await openRepository(repositoryPath);
  await fetchRemote();
  branches = await getBranches();
  await mainMenu();
  console.log('\n Bye! \n');
})();
