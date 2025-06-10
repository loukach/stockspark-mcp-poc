/**
 * Temporary File Management for Claude UI Images
 * Handles saving pasted images to temp files for faster uploads
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { logger } = require('./logger');

class TempFileManager {
  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'stockspark-images');
    this.ensureTempDir();
  }

  /**
   * Ensure temp directory exists
   */
  ensureTempDir() {
    try {
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
        logger.info('Created temp directory for images', { path: this.tempDir });
      }
    } catch (error) {
      logger.error('Failed to create temp directory', { error: error.message });
      // Fallback to OS temp dir
      this.tempDir = os.tmpdir();
    }
  }

  /**
   * Get file extension from MIME type
   */
  getExtensionFromMimeType(mimeType) {
    const mimeMap = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg', 
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/bmp': 'bmp'
    };
    return mimeMap[mimeType] || 'jpg';
  }

  /**
   * Save base64 image data to temporary file
   */
  saveImageToTempFile(base64Data, mimeType, filename = null) {
    try {
      // Clean base64 data
      const cleanBase64 = base64Data.replace(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/, '');
      
      // Generate filename
      const timestamp = Date.now();
      const extension = this.getExtensionFromMimeType(mimeType);
      const tempFilename = filename || `claude_image_${timestamp}_${Math.random().toString(36).substr(2, 5)}.${extension}`;
      const filepath = path.join(this.tempDir, tempFilename);
      
      // Convert and save
      const buffer = Buffer.from(cleanBase64, 'base64');
      fs.writeFileSync(filepath, buffer);
      
      logger.info('Saved image to temp file', {
        filepath,
        size: buffer.length,
        mimeType
      });
      
      return {
        success: true,
        filepath,
        size: buffer.length,
        filename: tempFilename
      };
      
    } catch (error) {
      logger.error('Failed to save image to temp file', {
        error: error.message,
        mimeType
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save multiple images to temp files
   */
  saveImagesToTempFiles(imageDataArray) {
    const results = [];
    const filepaths = [];
    
    for (let i = 0; i < imageDataArray.length; i++) {
      const imageData = imageDataArray[i];
      const result = this.saveImageToTempFile(
        imageData.data,
        imageData.mimeType,
        imageData.filename
      );
      
      results.push({
        index: i,
        ...result
      });
      
      if (result.success) {
        filepaths.push(result.filepath);
      }
    }
    
    return {
      results,
      filepaths,
      successCount: results.filter(r => r.success).length,
      totalCount: results.length
    };
  }

  /**
   * Process Claude UI image format to temp files
   */
  processClaudeImages(claudeImages) {
    const imageDataArray = claudeImages.map((img, index) => {
      if (!img.source || !img.source.data) {
        throw new Error(`Image ${index + 1}: Invalid Claude image format - missing source.data`);
      }
      
      return {
        data: img.source.data,
        mimeType: img.source.media_type || 'image/jpeg',
        filename: `claude_image_${index + 1}.${this.getExtensionFromMimeType(img.source.media_type || 'image/jpeg')}`
      };
    });
    
    return this.saveImagesToTempFiles(imageDataArray);
  }

  /**
   * Clean up temporary files
   */
  cleanupTempFiles(filepaths) {
    const cleaned = [];
    const errors = [];
    
    filepaths.forEach(filepath => {
      try {
        // Safety check - only delete files in our temp directory
        if (filepath.startsWith(this.tempDir) && fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
          cleaned.push(filepath);
          logger.debug('Cleaned up temp file', { filepath });
        }
      } catch (error) {
        errors.push({
          filepath,
          error: error.message
        });
        logger.warn('Failed to cleanup temp file', {
          filepath,
          error: error.message
        });
      }
    });
    
    return {
      cleaned,
      errors,
      cleanedCount: cleaned.length
    };
  }

  /**
   * Clean up old temp files (older than 1 hour)
   */
  cleanupOldTempFiles() {
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      let cleanedCount = 0;
      
      files.forEach(filename => {
        if (filename.startsWith('claude_image_')) {
          const filepath = path.join(this.tempDir, filename);
          const stats = fs.statSync(filepath);
          
          if (now - stats.mtime.getTime() > oneHour) {
            fs.unlinkSync(filepath);
            cleanedCount++;
          }
        }
      });
      
      if (cleanedCount > 0) {
        logger.info('Cleaned up old temp files', { count: cleanedCount });
      }
      
      return cleanedCount;
      
    } catch (error) {
      logger.warn('Failed to cleanup old temp files', { error: error.message });
      return 0;
    }
  }

  /**
   * Get temp directory info
   */
  getTempDirInfo() {
    try {
      const files = fs.readdirSync(this.tempDir);
      const imageFiles = files.filter(f => f.startsWith('claude_image_'));
      
      let totalSize = 0;
      imageFiles.forEach(filename => {
        const filepath = path.join(this.tempDir, filename);
        const stats = fs.statSync(filepath);
        totalSize += stats.size;
      });
      
      return {
        tempDir: this.tempDir,
        fileCount: imageFiles.length,
        totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
      };
      
    } catch (error) {
      return {
        tempDir: this.tempDir,
        error: error.message
      };
    }
  }
}

// Singleton instance
const tempFileManager = new TempFileManager();

// Cleanup old files on startup
tempFileManager.cleanupOldTempFiles();

module.exports = {
  TempFileManager,
  tempFileManager
};