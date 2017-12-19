import { DEFAULT_BASE_BRANCHES } from './const';

async function reviewBranch(branch, baseBranchName, commitsInBase) {
  console.log(commitsInBase.length);
}

async function reviewRemoteInteractive(argv, remoteBranches, baseBranch, commitsInBase) {
  const branches = remoteBranches.filter(
    branch =>
      !(
        DEFAULT_BASE_BRANCHES.some(branchName => branch.name.endsWith(branchName)) ||
        branch.name.endsWith(baseBranch)
      ),
  );

  for (let i = 0; i < branches.length; i++) {
    const branch = branches[i];
    console.log(`[${i + 1}/${branches.length}] reviewing branch "${branch.shortName}"`);
    await reviewBranch(branch, baseBranch, commitsInBase); // eslint-disable-line no-await-in-loop
  }
}

export default reviewRemoteInteractive;
