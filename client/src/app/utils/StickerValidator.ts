/**
 * StickerValidator - Validates sticker files and packs
 * 
 * Validates file formats (WebP, PNG) and size constraints (max 512KB)
 * per Requirements 1.2, 1.3, 1.5
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface PackMetadata {
  name: string;
  author: string;
}

export class StickerValidator {
  static readonly MAX_FILE_SIZE = 512 * 1024; // 512KB
  static readonly ALLOWED_FORMATS = ['image/webp', 'image/png'];
  static readonly MAX_STICKERS_PER_PACK = 50;

  /**
   * Validates a single sticker image file
   * Checks format (WebP, PNG) and size (max 512KB)
   */
  static validateImage(file: File): ValidationResult {
    const errors: ValidationError[] = [];

    // Check file format
    if (!this.ALLOWED_FORMATS.includes(file.type)) {
      errors.push({
        field: 'format',
        message: `Invalid file format. Allowed formats: ${this.ALLOWED_FORMATS.join(', ')}. Got: ${file.type}`,
      });
    }

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      errors.push({
        field: 'size',
        message: `File size exceeds maximum of ${this.MAX_FILE_SIZE / 1024}KB. Got: ${Math.round(file.size / 1024)}KB`,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates a complete sticker pack
   * Checks all files and pack metadata constraints
   */
  static validatePack(files: File[], metadata: PackMetadata): ValidationResult {
    const errors: ValidationError[] = [];

    // Check pack name
    if (!metadata.name || metadata.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Pack name is required',
      });
    } else if (metadata.name.length > 100) {
      errors.push({
        field: 'name',
        message: 'Pack name must be 100 characters or less',
      });
    }

    // Check author
    if (!metadata.author || metadata.author.trim().length === 0) {
      errors.push({
        field: 'author',
        message: 'Pack author is required',
      });
    }

    // Check number of stickers
    if (files.length === 0) {
      errors.push({
        field: 'files',
        message: 'At least one sticker is required',
      });
    } else if (files.length > this.MAX_STICKERS_PER_PACK) {
      errors.push({
        field: 'files',
        message: `Maximum ${this.MAX_STICKERS_PER_PACK} stickers per pack. Got: ${files.length}`,
      });
    }

    // Validate each file
    files.forEach((file, index) => {
      const fileValidation = this.validateImage(file);
      if (!fileValidation.valid) {
        fileValidation.errors.forEach((error) => {
          errors.push({
            field: `file_${index}_${error.field}`,
            message: `File "${file.name}": ${error.message}`,
          });
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
