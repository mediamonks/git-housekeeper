export const VALIDATE_VERSION_REGEX = /^\d+\.\d+\.\d+$/;

export const processors = [
  {
    version: '0.1.0',
    process: sheetData => {
      const META_PROPS = ['version', 'remote', 'url', 'baseBranch'];

      const meta = META_PROPS.reduce((props, name, index) => {
        // eslint-disable-next-line no-param-reassign
        props[name] = sheetData[index].values[0].userEnteredValue.stringValue;

        return props;
      }, {});

      const branchRows = sheetData
        .map(row => row.values)
        .filter(_ => _)
        .filter(
          cols =>
            cols[0] &&
            cols[0].userEnteredValue &&
            cols[0].userEnteredValue.stringValue &&
            cols[0].userEnteredValue.stringValue.startsWith(`refs/remotes/${meta.remote}`),
        );

      return {
        meta,
        branches: branchRows.map(branchRow => ({
          hidden: branchRow[0].userEnteredValue,
          action: branchRow[6] && branchRow[6].userEnteredValue,
        })),
      };
    },
  },
];

export function getProcessor(sheetVersion) {
  const processor = processors.find(({ version }) => {
    const splitVersion = version.split('.');
    const splitSheetVersion = sheetVersion.split('.');

    for (let i = 0; i < splitVersion.length; i++) {
      if (splitSheetVersion[i] > splitVersion[i]) {
        return true;
      }

      if (splitSheetVersion[i] < splitVersion[i]) {
        return false;
      }
    }

    return true;
  });

  if (!processor) {
    throw new Error(`Could not find processor for version ${sheetVersion}`);
  }

  return processor;
}
