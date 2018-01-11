import inquirer from 'inquirer';
import path from 'path';
import { removeReference, fetchRemote, setRemote } from '../git/remote';
import { getBranches } from '../git/branches';
import { getConfig } from '../args/config';

async function promptConfirmRemoveBranches(numDeletes) {
  const config = getConfig();
  const dryRun = config.d;
  const { response } = await inquirer.prompt([
    {
      name: 'response',
      message: `[review remote] Are you sure you want to delete ${numDeletes} branches? ${
        dryRun ? '(dry run)' : 'THIS CANNOT BE UNDONE!'
      }`,
      type: 'confirm',
    },
  ]);

  return response;
}

async function sheetResultMenu({ meta, branches: branchRows }) {
  const config = getConfig();
  const repositoryPath = path.resolve(config.path);
  await setRemote(meta.remote, meta.url);
  await fetchRemote();
  const branches = await getBranches();
  const noActionRows = [];
  const keepRows = [];
  const deleteRows = [];

  // eslint-disable-next-line no-restricted-syntax
  for (const row of branchRows) {
    const action = row.action && row.action.stringValue;
    const branchRef = row.hidden.stringValue;
    switch (action) {
      case 'KEEP':
        keepRows.push(branchRef);
        break;
      case 'DELETE':
        deleteRows.push(branchRef);
        break;
      default:
        noActionRows.push(branchRef);
    }
  }

  console.log(`\n\nrepository path: ${repositoryPath}`);
  console.log(`remote: ${meta.remote}`);
  console.log(`url: ${meta.url}`);
  if (keepRows.length) {
    console.log(`${keepRows.length} branches marked to keep`);
  }
  if (noActionRows.length) {
    console.log(`${noActionRows.length} branches with no action specified`);
  }
  if (deleteRows.length) {
    console.log(`${deleteRows.length} branches marked for removal`);
  }

  if (!deleteRows.length) {
    console.log('\n\nnothing to do here. Bye!');
    return false;
  }

  const deleteBranches = [];
  const goneBranches = [];
  const changedBranches = [];

  await Promise.all(
    deleteRows.map(async ref => {
      const [branchRef, headSha] = ref.split(':');
      const branch = branches.remotes.find(remoteBranch => remoteBranch.name === branchRef);
      if (branch) {
        deleteBranches.push(branch);

        if (branch.head.sha() !== headSha) {
          changedBranches.push(branch);
        }
      } else {
        goneBranches.push(branchRef);
      }
    }),
  );

  if (goneBranches.length) {
    console.log(`\nthe following branches in the sheet are no longer found on ${meta.remote}:`);
    goneBranches.forEach(ref => console.log(` - ${ref}`));
    console.log('these branches will be ignored\n');
  }

  if (changedBranches.length) {
    console.warn(
      `\nWARNING: the following branches have changed on remote "${
        meta.remote
      }" since the sheet was generated:`,
    );
    changedBranches.forEach(branch => console.warn(` - ${branch.shortName}`));
  }

  if (!deleteBranches.length) {
    console.log('nothing to do here. Bye!');
    return false;
  }

  console.log(`\nthe following branches will be deleted on ${meta.remote}:`);
  deleteBranches.forEach(branch => console.log(` - ${branch.shortName}`));
  console.log('\n');

  if (await promptConfirmRemoveBranches(deleteBranches.length)) {
    // eslint-disable-next-line no-restricted-syntax
    for (const branch of deleteBranches) {
      if (!branch) {
        console.warn(`Could not find branch: ${branch}`);
      } else {
        // eslint-disable-next-line no-await-in-loop
        await removeReference(branch.ref);
      }
    }
  }

  return false;
}

export default sheetResultMenu;
