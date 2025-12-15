// Configuration for printed document control footer
// Values can be provided via Vite env variables (VITE_...)
export const docControlConfig = {
    // Full single-line document control text. If provided, this will be used as-is.
    // Example: "PRO_70_F14/00 | Issue Date: August 01,2025 | Revision Date: N/A | Revision #: 0"
    text: (import.meta.env.VITE_DOC_CONTROL_TEXT as string) || '',
    // Fallback pieces when `text` is not provided
    issueDate: (import.meta.env.VITE_DOC_ISSUE_DATE as string) || 'August 01,2025',
    revisionDate: (import.meta.env.VITE_DOC_REVISION_DATE as string) || 'N/A',
    revisionNumber: (import.meta.env.VITE_DOC_REVISION_NUMBER as string) || '0',
    code: (import.meta.env.VITE_DOC_CONTROL_CODE as string) || 'PRO_70_F14/00',
    // Show signature line (true/false). Default true.
    showSignature: (import.meta.env.VITE_DOC_SHOW_SIGNATURE as string) !== 'false',
};

export function getDocControlString() {
    if (docControlConfig.text && docControlConfig.text.trim().length > 0) return docControlConfig.text;
    return `${docControlConfig.code} | Issue Date: ${docControlConfig.issueDate} | Revision Date: ${docControlConfig.revisionDate} | Revision #: ${docControlConfig.revisionNumber}`;
}

export default docControlConfig;
