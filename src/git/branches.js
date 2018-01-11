import { Reference } from 'nodegit';
import { getRepository } from './repository';
import { getTargetRemote } from './remote';
import { getConfig } from '../args/config';

let branches;

export async function getBranches(forceUpdate = false) {
  if (branches && !forceUpdate) {
    return branches;
  }

  const repository = await getRepository();
  const targetRemote = await getTargetRemote();
  const refs = await repository.getReferences(Reference.TYPE.OID);
  const config = await repository.config();

  const remotes = refs.filter(ref => ref.isRemote());
  const locals = refs.filter(ref => ref.isBranch());

  branches = {
    refs,
    remotes: await Promise.all(
      remotes.map(async ref => ({
        ref,
        shortName: ref.shorthand().replace(/^.+?\//, ''),
        name: ref.name(),
        onTargetRemote: ref.name().startsWith(`refs/remotes/${targetRemote.name()}/`),
        head: await repository.getReferenceCommit(ref),
      })),
    ),
    locals: await Promise.all(
      locals.map(async ref => {
        let remoteName = null;
        let upstreamName = null;

        try {
          const confBuff = await config.getStringBuf(`branch.${ref.shorthand()}.remote`);
          remoteName = confBuff.toString();
        } catch (e) {
          // ignore
        }

        try {
          const confBuff = await config.getStringBuf(`branch.${ref.shorthand()}.merge`);
          const merge = confBuff.toString();
          upstreamName = merge.replace('refs/heads/', '');
        } catch (e) {
          // ignore
        }

        return {
          ref,
          remoteName,
          upstreamName,
          name: ref.name(),
          shortName: ref.shorthand(),
          head: await repository.getReferenceCommit(ref),
          gone:
            upstreamName &&
            !remotes.some(remoteRef => remoteRef.name().endsWith(`${remoteName}/${upstreamName}`)),
        };
      }),
    ),
  };

  return branches;
}

export async function getAllCommitsInBranch(branchRef) {
  const repository = await getRepository();
  const headCommit = await repository.getReferenceCommit(branchRef);
  const history = headCommit.history();

  return new Promise((resolve, reject) => {
    history.on('end', resolve);
    history.on('error', reject);
    history.start();
  });
}

export async function getBranchAheadBehind(branchRef, shaInBase) {
  const commitsInBranch = await getAllCommitsInBranch(branchRef);
  const shaInBranch = commitsInBranch.map(commit => commit.sha());

  return {
    ahead: commitsInBranch.filter((commit, index) => !shaInBase.includes(shaInBranch[index])),
    behind: shaInBase.filter(sha => !shaInBranch.includes(sha)),
  };
}

export async function deleteBranch(branchRef) {
  const dryRun = getConfig().d;
  const command = `git branch -d ${branchRef.shorthand()}`;
  if (dryRun) {
    console.log(`[dry run] ${command}`);
  } else {
    console.log(command);
    await branchRef.delete();
  }
}
