import generateConditionalFormatting from './generateConditionalFormatting';
import { NUM_COMMITS_IN_SHEET, SHEET_COL_SIZE } from '../const';
import { processColSpan } from './sheetUtils';
import generateTitleRows from './generateTitleRows';
import generateHeadRow from './generateHeadRow';
import generateBranchRows from './generateBranchRows';

function generateSheetData({ branches, baseBranch, remote }) {
  const { merges, rowData } = processColSpan([
    ...generateTitleRows(baseBranch, remote),
    generateHeadRow(baseBranch),
    ...generateBranchRows(branches),
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
        // last commit date
        { pixelSize: S + 20 },
        // last commit time
        { pixelSize: S - 20 },
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
    conditionalFormats: generateConditionalFormatting(),
  };
}

export default generateSheetData;
