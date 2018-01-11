/* eslint-disable import/prefer-default-export */
import path from 'path';
import { Repository } from 'nodegit';
import { getConfig } from '../args/config';

let repository;

export async function getRepository() {
  if (!repository) {
    const config = getConfig();
    const repositoryPath = path.resolve(config.path);

    try {
      repository = await Repository.open(repositoryPath);
    } catch (e) {
      console.error(`Could not open repository at "${repositoryPath}"`);
      throw e;
    }
  }

  return repository;
}
