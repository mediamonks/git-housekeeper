import { getSheetData } from './sheetsApi';

async function processSheet(argv, spreadsheetId, remoteBranches, baseBranch) {
  const sheetData = await getSheetData(spreadsheetId);

  console.log(sheetData);
}

export default processSheet;
