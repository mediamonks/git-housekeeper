import opn from 'opn';
import ProgressBar from 'progress';
import { DEFAULT_BASE_BRANCHES, NUM_COMMITS_IN_SHEET, SHEET_COL_SIZE } from '../const';
import { getCommitsInBranchUntil } from '../git';
import { authenticate, createSheet } from './sheetsApi';
import { generateHeadRow, generateTitleRows } from './sheetTitleHead';

function processColSpan(rowDataWithSpan, sheetId = 0) {
  const rowData = [];
  const merges = [];

  for (let rowIndex = 0; rowIndex < rowDataWithSpan.length; rowIndex++) {
    rowData[rowIndex] = {
      ...rowDataWithSpan[rowIndex],
      values: [],
    };
    const row = rowDataWithSpan[rowIndex].values;
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const col = row[colIndex];
      if (col.span && col.col) {
        const trueColIndex = rowData[rowIndex].values.length;
        const colSpan = col.span.cols || 1;
        merges.push({
          sheetId,
          startRowIndex: rowIndex,
          endRowIndex: rowIndex + (col.span.rows || 1),
          startColumnIndex: trueColIndex,
          endColumnIndex: trueColIndex + colSpan,
        });

        rowData[rowIndex].values.push(col.col);
        for (let i = 0; i < colSpan - 1; i++) {
          rowData[rowIndex].values.push({});
        }
      } else {
        rowData[rowIndex].values.push(col);
      }
    }
  }

  return { rowData, merges };
}

function generateSheetData(branches, branchCommits, baseBranch) {
  const { merges, rowData } = processColSpan([
    ...generateTitleRows(baseBranch),
    generateHeadRow(baseBranch),
  ]);
  const { HIDDEN, S, M, L } = SHEET_COL_SIZE;

  return {
    properties: {
      sheetId: 0,
      title: 'branches',
      gridProperties: {
        frozenRowCount: 4,
      },
    },
    data: {
      startRow: 0,
      startColumn: 0,
      rowData,
      columnMetadata: [
        // hidden
        { pixelSize: HIDDEN },
        // last commit author
        { pixelSize: M },
        // branch
        { pixelSize: L },
        // authors
        { pixelSize: L },
        // last commit time
        { pixelSize: M },
        // action
        { pixelSize: M },
        // behind
        { pixelSize: S },
        // ahead
        { pixelSize: S },
        // commits
        ...new Array(NUM_COMMITS_IN_SHEET).fill({ pixelSize: S }),
      ],
    },
    merges,
  };
}

async function reviewGoogleSheets(argv, remoteBranches, baseBranch, commitsInBase) {
  const authenticated = await authenticate();
  if (!authenticated) {
    return true;
  }

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
  const sheetData = generateSheetData(branches, branchCommits, baseBranch);
  const response = await createSheet(sheetData, 'test sheet');
  if (!response) {
    return true;
  }
  console.log('Created google sheet at:');
  console.log(response.spreadsheetUrl);
  opn(response.spreadsheetUrl);
}

export default reviewGoogleSheets;
