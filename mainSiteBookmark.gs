function listFormated(listReadFromGss) {
  var listFormated = [];
  for (let j = 0; j < listReadFromGss.length; j++) {
    // "if" statement in one liner. If '', nothing to do.
    listReadFromGss[j][0]=='' ? true : listFormated.push(listReadFromGss[j][0]);
  }
  return listFormated
}

/**
 * Get number of record in Google Spreadsheet.
 *
 * @param {"bookmarkSites"} sheetName - Name of sheet that you wanna know number of record.
 * @return Number of record
 * @customfunction
 */
function get_row_to_read_actual_in_GSS(sheetName) {
  // declare list for warning message.
  var warningMessage = 'Warning: Number of row passing over \"row_to_read\". Tweak me.';
  var errorMessage   = 'RowIndexOutOfBoundsError: Number of row reached \"row_to_read\". Tweak me.';

  // declare variables for row and column index.
  var row_to_read = 201;
  var row_to_read_actual;

  // declare list.
  var idList;

  // get sheet.
  var ss    = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(sheetName);

  // memorize number of row to read
  console.time(`SELECT TOP ${row_to_read - 1} id FROM \'${sheetName}\'`);
  idList = sheet.getRange(
    2
    , COLUMN_FOR_SITE_BOOKMARK_OF_ID
    , row_to_read - 1
    , 1
  ).getValues();
  console.timeEnd(`SELECT TOP ${row_to_read - 1} id FROM \'${sheetName}\'`);
  idList_formated = listFormated(idList);
  
  // warning message. If condition is false, nothing to do.
  row_to_read_actual = Number(idList_formated.reduce((a,b)=>Math.max(a,b)));
  row_to_read - row_to_read_actual <= 2 ? console.warn(warningMessage) : false;
  if(row_to_read_actual >= row_to_read - 1){
    console.error(errorMessage);
    return 0;
  }
  return row_to_read_actual;
}

/**
 * Get list to set image onto Google Spreadsheet.
 *
 * @return [[number], [string]] - recordId and fileFullname
 * @customfunction
 */
function getListToSetImage() {
  // declare variables for prepare.
  var ss,
    sheet;
  var bookmarkList;
  ss    = SpreadsheetApp.getActive();
  sheet = ss.getSheetByName(SHEET_NAME_2ND);

  var row_to_read_actual = get_row_to_read_actual_in_GSS(SHEET_NAME_2ND);
  if(row_to_read_actual == 0){
    console.error(ERROR_MESSAGE_LIST[0]);
    return false;
  }

  // Get files' name and fullname to JSON format.
  var folder = DriveApp.getFolderById(ICON_FOLDER_ID),
      files  = folder.getFiles(),
      file;
  var fileNameList            = [],
      fileFullNameList        = [],
      fileNameDict            = {},
      iconInsertingRecordList = [];
  while(files.hasNext()) {
    file = files.next();
    fileNameList.push(file.getName().match(/([^/]*)\./)[1]);
    fileFullNameList.push(file.getName())
  }
  fileNameDict['name']     = fileNameList;
  fileNameDict['fullName'] = fileFullNameList;
  
  // Get siteName list from GSS and extract record that fileName and siteName are same.
  bookmarkList = sheet.getRange(
    NUMBER_OF_ROW_FOR_SITE_BOOKMARK_OF_HEADER + 1
    , COLUMN_FOR_SITE_BOOKMARK_OF_ID
    , row_to_read_actual
    , COLUMN_FOR_SITE_BOOKMARK_OF_ICON
  ).getValues();
  bookmarkList.forEach(function(record) {
    if (record[COLUMN_FOR_SITE_BOOKMARK_OF_ICON - 1] == '') {
      for (let i = 0; i < fileNameDict['name'].length; i++){
        if (fileNameDict['name'][i] == record[COLUMN_FOR_SITE_BOOKMARK_OF_SITE_NAME - 1]) {
          iconInsertingRecordList.push([record[COLUMN_FOR_SITE_BOOKMARK_OF_ID - 1], fileNameDict['fullName'][i]]);
          break;
        }
      }
    }else{
      // nothing to do.
    }
  });
  
  return iconInsertingRecordList;
}

function serializeArray(targetArray){
  var onlyStringArray = [];
  targetArray.forEach(item => {
    onlyStringArray.push(`[${String(item)}]`);
  });
  var serializedArray = onlyStringArray.join(',');
  return serializedArray;
}

function setImageFromList(listToSetImage) {
  // declare variables.
  var file;
  var iconUrl,
    formattedUrl;
  var ss    = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(SHEET_NAME_2ND);

  console.info(`INFO: listToSetImage is ${serializeArray(listToSetImage)}`);
  
  // In this case, not in-cell image but OverGridImage...
  // var file = DriveApp.getFolderById(iconFolderId).getFilesByName('note.png').next();
  // var fileBlob = file.getBlob();
  // var insertedImage = sheet.insertImage(fileBlob, column_for_siteBookmark_of_icon, 4);
  // insertedImage.setAnchorCell(sheet.getRange(4, column_for_siteBookmark_of_icon));

  // execute this code to set file permission and set in-cell image.
  listToSetImage.forEach(record => {
    file = DriveApp.getFolderById(ICON_FOLDER_ID).getFilesByName(record[1]).next();
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    iconUrl = file.getUrl();
    formattedUrl = iconUrl.replace('file/d/', 'uc?export=download&id=').replace('/view?usp=drivesdk', '');
    sheet.getRange(
      record[0] + NUMBER_OF_ROW_FOR_SITE_BOOKMARK_OF_HEADER
      , COLUMN_FOR_SITE_BOOKMARK_OF_ICON
    ).setFormula(
      `=IMAGE(\"${formattedUrl}\")`
    );
  });
}

function setImageFromGoogleDrive() {
  var listToSetImage = getListToSetImage();
  console.time(`UPDATE \'${SHEET_NAME_2ND}\' SET favicon = ∀image WHERE favicon = ''`);
  setImageFromList(listToSetImage);
  console.timeEnd(`UPDATE \'${SHEET_NAME_2ND}\' SET favicon = ∀image WHERE favicon = ''`);
  return `Set icons to sheet with ${listToSetImage.length} image files.`;
}
