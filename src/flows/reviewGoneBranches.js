import inquirer from 'inquirer';
import { deleteBranch, getBranches } from '../git/branches';
import { getTargetRemote } from '../git/remote';
import { getConfig } from '../args/config';

async function reviewGoneBranches() {
  const branches = await getBranches();
  const config = getConfig();
  const goneBranches = branches.locals.filter(branch => branch.gone);
  const remoteName = (await getTargetRemote()).name();
  if (!goneBranches.length) {
    console.log('All tracking branches have been found on remote. Returning to main menu...\n');
    return true;
  }

  console.log(
    `The following branches have been setup to track a remote, but the upstream branch no longer exist on remote "${remoteName}":`,
  );
  goneBranches.forEach(branch => console.log(` - ${branch.shortName}`));
  console.log('');

  const { shouldDelete } = await inquirer.prompt([
    {
      name: 'shouldDelete',
      type: 'confirm',
      message: `[review gone] would you like to delete these local branches? ${
        config.d ? '(dry run)' : ''
      }`,
    },
  ]);

  if (shouldDelete) {
    await Promise.all(goneBranches.map(branch => deleteBranch(branch.ref)));
    return false;
  }

  console.log('\nok, returning to main menu\n');
  return true;
}

export default reviewGoneBranches;
