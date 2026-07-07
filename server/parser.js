import pdf from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';

/**
 * Extracts text content from a file buffer based on its MIME type.
 * For images, returns a placeholder flag so the caller knows to send the image buffer directly to Gemini.
 * @param {Buffer} buffer - The file buffer.
 * @param {string} mimeType - The file MIME type.
 * @returns {Promise<string>} The extracted text.
 */
export async function parseFile(buffer, mimeType) {
  if (!mimeType) {
    return buffer.toString('utf-8');
  }

  if (mimeType === 'application/pdf') {
    try {
      const data = await pdf(buffer);
      return data.text || '';
    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw new Error('Failed to parse PDF document.');
    }
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } catch (error) {
      console.error('Error parsing DOCX:', error);
      throw new Error('Failed to parse DOCX document.');
    }
  }

  if (mimeType.startsWith('text/')) {
    return buffer.toString('utf-8');
  }

  if (mimeType.startsWith('image/')) {
    // Return a flag indicating it is an image and can be parsed via Gemini Multimodal.
    return '[IMAGE_CONTENT_PENDING_MULTIMODAL_OCR]';
  }

  // Fallback to plain text
  return buffer.toString('utf-8');
}
