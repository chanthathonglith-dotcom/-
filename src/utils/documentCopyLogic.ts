import { DocumentRecord } from '../types/document';
import { buildPrintableDocumentSummary } from './documentPrintLogic';

export function formatDocumentDetailsForClipboard(
  record: DocumentRecord,
  trackingUrl?: string
): string {
  const summary = buildPrintableDocumentSummary(record);

  const lines: string[] = [
    `=== ຂໍ້ມູນເອກະສານ (${summary.directionLabel}) ===`,
    `ລະຫັດອ້າງອີງ: ${summary.referenceId}`,
    `ເລກທີເອກະສານ: ${summary.docNumber}`,
    `ເລກທີເອກະສານຂາອອກ: ${summary.outgoingDocNumber}`,
    `ຫົວຂໍ້: ${summary.title}`,
    `${summary.partyLabel}: ${summary.department}`,
    `ຈຸດປະສົງ: ${summary.purposeLabel}`,
    `ສະຖານະຕິດຕາມ: ${summary.statusLabel}`,
    `ວັນທີ, ເດືອນ, ປີ ເອກະສານຂາເຂົ້າ: ${summary.incomingDateText}`,
    `ວັນທີ, ເດືອນ, ປີ ເອກະສານຂາອອກ: ${summary.outgoingDateText}`,
    `ວັນທີເອກະສານຫຼັກ: ${summary.docDateText}`,
    `ວັນທີກຳນົດ: ${summary.dueDateText}`,
    `ຄຳເຫັນຂອງການນຳ: ${summary.leadershipComment}`,
  ];

  if (summary.approverName || summary.hasSignature) {
    const signStatus = summary.hasSignature
      ? summary.signedAtText
        ? `ລົງນາມແລ້ວ (${summary.signedAtText})`
        : 'ລົງນາມແລ້ວ'
      : 'ຍັງບໍ່ທັນໄດ້ແຕ້ມລາຍເຊັນ';
    lines.push(
      `ຜູ້ອະນຸມັດ: ${summary.approverName || '-'} — ${signStatus}`
    );
  } else {
    lines.push('ຜູ້ອະນຸມັດ: ຍັງບໍ່ທັນມີລາຍເຊັນຜູ້ອະນຸມັດ');
  }

  if (summary.scanLink) {
    lines.push(
      `ຟາຍສະແກນ: ${
        summary.scanFileName
          ? `${summary.scanFileName} (${summary.scanLink})`
          : summary.scanLink
      }`
    );
  } else {
    lines.push('ຟາຍສະແກນ: ຍັງບໍ່ໄດ້ແນບຟາຍສະແກນ');
  }

  const cleanTrackingUrl = (trackingUrl || '').trim();
  if (cleanTrackingUrl) {
    lines.push(`ລິ້ງຕິດຕາມເອກະສານ: ${cleanTrackingUrl}`);
  }

  return lines.join('\n');
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback to execCommand below for restricted/iframe environments
    }
  }

  if (typeof document === 'undefined') {
    return false;
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return Boolean(copied);
  } catch {
    return false;
  }
}
