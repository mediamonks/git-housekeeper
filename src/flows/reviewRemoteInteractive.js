import moment from 'moment';
import inquirer from 'inquirer';
import { getAllCommitsInBranch, getBranchAheadBehind, getBranches } from '../git/branches';
import { getReferenceFromTargetRemote, removeReference } from '../git/remote';
import { COMMITS_PAGE_SIZE, DEFAULT_BASE_BRANCHES } from '../const';

const ACTION_EXIT = 0;
const ACTION_SHOW_MORE = 1;
const ACTION_KEEP = 2;
const ACTION_DELETE = 3;

async function logCommitsAndPrompt(commits, page = 0) {
  const commitsToLog = commits.slice(page * COMMITS_PAGE_SIZE, (page + 1) * COMMITS_PAGE_SIZE);
  const hasMore = commits.length > (page + 1) * COMMITS_PAGE_SIZE;

  commitsToLog.forEach(commit => {
    console.log(` - ${commit.author()} | ${moment(commit.timeMs()).fromNow()}`);
    console.log(`   ${commit.summary()}`);
  });

  const { action } = await inquirer.prompt([
    {
      name: 'action',
      type: 'list',
      choices: [
        {
          name: 'keep this branch',
          value: ACTION_KEEP,
        },
        {
          name: 'delete this branch',
          value: ACTION_DELETE,
        },
        ...(hasMore
          ? [
              {
                name: 'show me more commits',
                value: ACTION_SHOW_MORE,
              },
            ]
          : []),
        {
          name: 'exit',
          value: ACTION_EXIT,
        },
      ],
      message: '[review remote] What would you like to do with this branch?',
    },
  ]);

  if (action === ACTION_SHOW_MORE) {
    return logCommitsAndPrompt(commits, page + 1);
  }
  return action;
}

async function reviewBranch(branch, baseBranchName, commitsInBase) {
  const shaInBase = commitsInBase.map(commit => commit.sha());
  const { ahead: branchCommits } = await getBranchAheadBehind(branch.ref, shaInBase);

  if (branchCommits.length) {
    console.log(`contains ${branchCommits.length} commits that don't exist in ${baseBranchName}:`);
  } else {
    console.log(`all commits in branch also exist in ${baseBranchName}`);
  }

  return logCommitsAndPrompt(branchCommits);
}

async function reviewRemoteInteractive(baseBranch) {
  const { remotes: allRemotes } = await getBranches();
  const commitsInBase = await getAllCommitsInBranch(await getReferenceFromTargetRemote(baseBranch));
  const branchesToReview = allRemotes.filter(
    branch =>
      !(
        DEFAULT_BASE_BRANCHES.some(branchName => branch.name.endsWith(branchName)) ||
        branch.name.endsWith(baseBranch)
      ) && branch.onTargetRemote,
  );

  for (let i = 0; i < branchesToReview.length; i++) {
    const branch = branchesToReview[i];
    console.log(`\n\n[${i + 1}/${branchesToReview.length}] reviewing branch "${branch.shortName}"`);
    // eslint-disable-next-line no-await-in-loop
    const action = await reviewBranch(branch, baseBranch, commitsInBase);

    switch (action) {
      case ACTION_EXIT:
        return false;
      case ACTION_DELETE:
        // eslint-disable-next-line no-await-in-loop
        await removeReference(branch.ref);
        break;
      case ACTION_KEEP:
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  console.log('\n\nAll branches reviewed!');

  return false;
}

export default reviewRemoteInteractive;
