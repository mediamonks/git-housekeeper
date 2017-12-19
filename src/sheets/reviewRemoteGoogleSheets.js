import ProgressBar from 'progress';
import { DEFAULT_BASE_BRANCHES } from '../const';
import { getCommitsInBranchUntil } from '../git';
import { authenticate } from './sheetsApi';

async function reviewGoogleSheets(argv, remoteBranches, baseBranch, commitsInBase) {
  await authenticate();

  const branches = remoteBranches.filter(
    branch =>
      !(
        DEFAULT_BASE_BRANCHES.some(branchName => branch.name.endsWith(branchName)) ||
        branch.name.endsWith(baseBranch)
      ),
  );

  console.log('reading commits on remote branches...');

  const shaInBase = commitsInBase.map(commit => commit.sha());
  const progressBar = new ProgressBar(':bar', { total: branches.length });

  const branchCommits = await Promise.all(
    branches.map(async branch => {
      const commits = await getCommitsInBranchUntil(
        branch.ref,
        commit => !shaInBase.includes(commit.sha()),
      );

      progressBar.tick();
      return commits;
    }),
  );

  progressBar.terminate();
}

export default reviewGoogleSheets;
