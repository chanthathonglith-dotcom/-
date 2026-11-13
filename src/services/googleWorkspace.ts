import { DocumentRecord, WorkspaceConnection } from '../types/document';
import {
  SHEET_HEADERS,
  documentToSheetRow,
  sheetRowsToDocuments,
} from '../utils/documentLogic';

const DRIVE_FOLDER_NAME = 'ຟາຍສະແກນເອກະສານ (Document Scans)';
const DEFAULT_SPREADSHEET_TITLE = 'ລະບົບຈັດການເອກະສານຂາເຂົ້າ-ຂາອອກ';
const DEFAULT_SHEET_TAB_TITLE = 'ເອກະສານ';

export class WorkspaceAuthError extends Error {
  constructor(message = 'Session ໝົດອາຍຸ ກະລຸນາເຂົ້າສູ່ລະບົບ Google ໃໝ່ອີກຄັ້ງ') {
    super(message);
    this.name = 'WorkspaceAuthError';
  }
}

async function googleFetch(url: string, token: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    throw new WorkspaceAuthError();
  }

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      detail = errJson?.error?.message || detail;
    } catch {
      // ignore non-JSON error body
    }
    throw new Error(`ການເຊື່ອມຕໍ່ Google Workspace ຂັດຂ້ອງ: ${detail}`);
  }

  return response;
}

export async function ensureScanFolder(token: string): Promise<{
  id: string;
  name: string;
  url: string;
}> {
  const query = `name = '${DRIVE_FOLDER_NAME.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchRes = await googleFetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink)&pageSize=5`,
    token
  );
  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    const folder = searchData.files[0];
    return {
      id: folder.id,
      name: folder.name,
      url: folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`,
    };
  }

  const createRes = await googleFetch(
    'https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink',
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: DRIVE_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    }
  );
  const created = await createRes.json();
  return {
    id: created.id,
    name: created.name,
    url: created.webViewLink || `https://drive.google.com/drive/folders/${created.id}`,
  };
}

export async function uploadScanFileToDrive(
  token: string,
  folderId: string,
  file: File
): Promise<{
  id: string;
  name: string;
  webViewLink: string;
}> {
  const metadata = {
    name: file.name,
    parents: [folderId],
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', file);

  const res = await googleFetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
    token,
    {
      method: 'POST',
      body: form,
    }
  );
  const data = await res.json();
  return {
    id: data.id,
    name: data.name || file.name,
    webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
  };
}

export async function deleteDriveFile(token: string, fileId: string): Promise<void> {
  await googleFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, token, {
    method: 'DELETE',
  });
}

export async function getSpreadsheetMetadata(
  token: string,
  spreadsheetId: string
): Promise<{
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  sheetTitle: string;
  sheetId: number;
}> {
  const res = await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}?fields=spreadsheetId,spreadsheetUrl,properties.title,sheets(properties(sheetId,title))`,
    token
  );
  const data = await res.json();
  const firstSheet = data.sheets?.[0]?.properties;
  if (!firstSheet) {
    throw new Error('ບໍ່ພົບແຜ່ນວຽກ (Sheet Tab) ໃນ Google Sheets ນີ້');
  }

  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetTitle: data.properties?.title || DEFAULT_SPREADSHEET_TITLE,
    spreadsheetUrl:
      data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}`,
    sheetTitle: firstSheet.title,
    sheetId: firstSheet.sheetId,
  };
}

async function ensureHeadersOnSheet(
  token: string,
  spreadsheetId: string,
  sheetTitle: string,
  sheetId: number
): Promise<void> {
  const range = `'${sheetTitle.replace(/'/g, "''")}'!A1:T1`;
  const checkRes = await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(range)}`,
    token
  );
  const checkData = await checkRes.json();
  const existingRow = checkData.values?.[0];

  if (!existingRow || existingRow.length < SHEET_HEADERS.length) {
    await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        spreadsheetId
      )}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      token,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [[...SHEET_HEADERS]] }),
      }
    );

    await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        spreadsheetId
      )}:batchUpdate`,
      token,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: SHEET_HEADERS.length,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.94, green: 0.96, blue: 0.99 },
                    textFormat: { bold: true },
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)',
              },
            },
          ],
        }),
      }
    );
  }
}

export async function createNewSpreadsheet(token: string): Promise<{
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  sheetTitle: string;
  sheetId: number;
}> {
  const createRes = await googleFetch(
    'https://sheets.googleapis.com/v4/spreadsheets',
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        properties: { title: DEFAULT_SPREADSHEET_TITLE },
        sheets: [
          {
            properties: {
              title: DEFAULT_SHEET_TAB_TITLE,
              gridProperties: { frozenRowCount: 1 },
            },
          },
        ],
      }),
    }
  );
  const created = await createRes.json();
  const firstSheet = created.sheets?.[0]?.properties;
  const sheetTitle = firstSheet?.title || DEFAULT_SHEET_TAB_TITLE;
  const sheetId = firstSheet?.sheetId ?? 0;

  await ensureHeadersOnSheet(token, created.spreadsheetId, sheetTitle, sheetId);

  return {
    spreadsheetId: created.spreadsheetId,
    spreadsheetTitle: created.properties?.title || DEFAULT_SPREADSHEET_TITLE,
    spreadsheetUrl:
      created.spreadsheetUrl ||
      `https://docs.google.com/spreadsheets/d/${created.spreadsheetId}`,
    sheetTitle,
    sheetId,
  };
}

export async function initializeWorkspace(
  token: string,
  uid: string,
  preferredSpreadsheetId?: string
): Promise<WorkspaceConnection> {
  const folder = await ensureScanFolder(token);
  const storageKey = `doc_registry_spreadsheet_${uid}`;
  const candidateId = preferredSpreadsheetId || localStorage.getItem(storageKey) || '';

  let sheetMeta: Awaited<ReturnType<typeof getSpreadsheetMetadata>> | null = null;

  if (candidateId) {
    try {
      sheetMeta = await getSpreadsheetMetadata(token, candidateId);
    } catch (err) {
      if (err instanceof WorkspaceAuthError) throw err;
      sheetMeta = null;
    }
  }

  if (!sheetMeta) {
    const query = `mimeType = 'application/vnd.google-apps.spreadsheet' and name = '${DEFAULT_SPREADSHEET_TITLE}' and trashed = false`;
    const searchRes = await googleFetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        query
      )}&fields=files(id,name)&orderBy=modifiedTime desc&pageSize=3`,
      token
    );
    const searchData = await searchRes.json();
    const foundId = searchData.files?.[0]?.id;
    if (foundId) {
      sheetMeta = await getSpreadsheetMetadata(token, foundId);
    }
  }

  if (!sheetMeta) {
    sheetMeta = await createNewSpreadsheet(token);
  } else {
    await ensureHeadersOnSheet(
      token,
      sheetMeta.spreadsheetId,
      sheetMeta.sheetTitle,
      sheetMeta.sheetId
    );
  }

  localStorage.setItem(storageKey, sheetMeta.spreadsheetId);

  return {
    ...sheetMeta,
    driveFolderId: folder.id,
    driveFolderName: folder.name,
    driveFolderUrl: folder.url,
  };
}

export async function fetchDocumentsFromSheet(
  token: string,
  conn: WorkspaceConnection
): Promise<DocumentRecord[]> {
  const range = `'${conn.sheetTitle.replace(/'/g, "''")}'!A1:T`;
  const res = await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      conn.spreadsheetId
    )}/values/${encodeURIComponent(range)}`,
    token
  );
  const data = await res.json();
  return sheetRowsToDocuments(data.values || []);
}

export async function appendDocumentToSheet(
  token: string,
  conn: WorkspaceConnection,
  doc: DocumentRecord
): Promise<void> {
  const range = `'${conn.sheetTitle.replace(/'/g, "''")}'!A:T`;
  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      conn.spreadsheetId
    )}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [documentToSheetRow(doc)] }),
    }
  );
}

async function findRowNumberById(
  token: string,
  conn: WorkspaceConnection,
  docId: string
): Promise<number> {
  const range = `'${conn.sheetTitle.replace(/'/g, "''")}'!A1:A`;
  const res = await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      conn.spreadsheetId
    )}/values/${encodeURIComponent(range)}`,
    token
  );
  const data = await res.json();
  const rows: string[][] = data.values || [];
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i]?.[0] ?? '').trim() === docId) {
      return i + 1;
    }
  }
  throw new Error('ບໍ່ພົບແຖວຂໍ້ມູນເອກະສານນີ້ໃນ Google Sheets');
}

export async function updateDocumentInSheet(
  token: string,
  conn: WorkspaceConnection,
  doc: DocumentRecord
): Promise<void> {
  const rowNumber = await findRowNumberById(token, conn, doc.id);
  const range = `'${conn.sheetTitle.replace(/'/g, "''")}'!A${rowNumber}:T${rowNumber}`;
  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      conn.spreadsheetId
    )}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    token,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [documentToSheetRow(doc)] }),
    }
  );
}

export async function deleteDocumentInSheet(
  token: string,
  conn: WorkspaceConnection,
  docId: string
): Promise<void> {
  const rowNumber = await findRowNumberById(token, conn, docId);
  const zeroBasedIndex = rowNumber - 1;
  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      conn.spreadsheetId
    )}:batchUpdate`,
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: conn.sheetId,
                dimension: 'ROWS',
                startIndex: zeroBasedIndex,
                endIndex: zeroBasedIndex + 1,
              },
            },
          },
        ],
      }),
    }
  );
}
