import { COLOR_KEEP, COLOR_DELETE } from '../const';

const generateConditionalFormatting = () => [
  {
    ranges: [
      {
        sheetId: 0,
        startRowIndex: 4,
        startColumnIndex: 1,
        endColumnIndex: 7,
      },
    ],
    booleanRule: {
      condition: {
        type: 'CUSTOM_FORMULA',
        values: [
          {
            userEnteredValue: '=EQ(INDIRECT("RC7",false), "KEEP")',
          },
        ],
      },
      format: {
        backgroundColor: COLOR_KEEP,
      },
    },
  },
  {
    ranges: [
      {
        sheetId: 0,
        startRowIndex: 4,
        startColumnIndex: 1,
        endColumnIndex: 7,
      },
    ],
    booleanRule: {
      condition: {
        type: 'CUSTOM_FORMULA',
        values: [
          {
            userEnteredValue: '=EQ(INDIRECT("RC7",false), "DELETE")',
          },
        ],
      },
      format: {
        backgroundColor: COLOR_DELETE,
      },
    },
  },
];

export default generateConditionalFormatting;
