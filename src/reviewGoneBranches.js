import inquirer from 'inquirer';
import { deleteBranch } from './git';

async function reviewGoneBranches(argv, goneBranches) {
  if (!goneBranches.length) {
    console.log('All tracking branches have been found on remote. Returning to main menu...\n');
    return true;
  }

  console.log(
    'The following branches have been setup to track a remote, ' +
      'but the remote branches no longer exist:\n',
  );
  goneBranches.forEach(branch => console.log(` - ${branch.shorthand}`));
  console.log('');

  const { shouldDelete } = await inquirer.prompt([
    {
      name: 'shouldDelete',
      type: 'confirm',
      message: `would you like to delete these local branches? ${argv.d ? '(dry run)' : ''}`,
    },
  ]);

  if (shouldDelete) {
    await Promise.all(goneBranches.map(branch => deleteBranch(branch.ref, argv.d)));
    return false;
  }

  console.log('\nok, returning to main menu\n');
  return true;
}

export default reviewGoneBranches;
