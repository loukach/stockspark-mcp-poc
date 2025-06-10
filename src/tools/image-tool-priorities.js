/**
 * Image Upload Tool Prioritization System
 * Defines the order and conditions for using different image upload methods
 */

const IMAGE_UPLOAD_PRIORITIES = {
  /**
   * Priority 1: Claude UI Optimized (FASTEST)
   * Use when: Users paste images directly in Claude UI
   * Performance: 70-90% faster than other methods
   * Tool: upload_vehicle_images_claude
   */
  CLAUDE_OPTIMIZED: {
    priority: 1,
    tool: 'upload_vehicle_images_claude',
    description: '🚀 PRIORITY METHOD: For images pasted in Claude UI',
    useWhen: [
      'User pastes images in conversation',
      'Images come from Claude UI',
      'Image data has Claude format structure',
      'Need fastest upload speed'
    ],
    performance: 'Fastest (1-2 seconds)',
    dataFormat: {
      type: 'object',
      structure: {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'string',
          data: 'string (optimized)'
        }
      }
    }
  },

  /**
   * Priority 2: File Paths and URLs (RECOMMENDED)
   * Use when: You have file paths or URLs to images
   * Performance: Fast and reliable
   * Tool: upload_vehicle_images
   */
  FILES_AND_URLS: {
    priority: 2,
    tool: 'upload_vehicle_images',
    description: '⚡ RECOMMENDED: For file paths and URLs',
    useWhen: [
      'Images are saved as files on device',
      'Images are available via URLs',
      'Batch uploading from storage',
      'Working with pre-existing images'
    ],
    performance: 'Fast (2-5 seconds)',
    dataFormat: {
      type: 'array',
      items: 'string (file path or URL)'
    }
  },

  /**
   * Priority 3: Raw Base64 (FALLBACK ONLY)
   * Use when: Other methods fail or unavailable
   * Performance: Slowest method
   * Tool: upload_vehicle_images_from_data
   */
  RAW_BASE64: {
    priority: 3,
    tool: 'upload_vehicle_images_from_data',
    description: '⚠️ FALLBACK ONLY: Raw base64 data (SLOW)',
    useWhen: [
      'upload_vehicle_images_claude fails',
      'Image data not in Claude format',
      'Legacy compatibility needed',
      'Last resort only'
    ],
    performance: 'Slowest (5-15+ seconds)',
    dataFormat: {
      type: 'array',
      items: {
        data: 'string (raw base64)',
        mimeType: 'string',
        filename: 'string'
      }
    }
  }
};

/**
 * Decision logic for AI agents to choose the right upload method
 */
const UPLOAD_METHOD_DECISION_TREE = {
  /**
   * Step 1: Check if images are from Claude UI
   */
  checkClaudeFormat(imageData) {
    if (Array.isArray(imageData)) {
      return imageData.every(img => 
        img && 
        img.type === 'image' && 
        img.source && 
        img.source.type === 'base64' &&
        img.source.data &&
        img.source.media_type
      );
    }
    return false;
  },

  /**
   * Step 2: Check if we have file paths or URLs
   */
  checkFilePathsOrUrls(imageData) {
    if (Array.isArray(imageData)) {
      return imageData.every(item => 
        typeof item === 'string' && 
        (item.startsWith('/') || 
         item.startsWith('http://') || 
         item.startsWith('https://') ||
         item.includes('/') || 
         item.includes('\\'))
      );
    }
    return false;
  },

  /**
   * Step 3: Check if we have raw base64 data
   */
  checkRawBase64(imageData) {
    if (Array.isArray(imageData)) {
      return imageData.every(item =>
        item &&
        typeof item === 'object' &&
        item.data &&
        item.mimeType &&
        typeof item.data === 'string'
      );
    }
    return false;
  },

  /**
   * Main decision function
   */
  chooseUploadMethod(imageData) {
    // Priority 1: Claude optimized format
    if (this.checkClaudeFormat(imageData)) {
      return {
        method: IMAGE_UPLOAD_PRIORITIES.CLAUDE_OPTIMIZED,
        reason: 'Images are in Claude UI optimized format'
      };
    }

    // Priority 2: File paths or URLs
    if (this.checkFilePathsOrUrls(imageData)) {
      return {
        method: IMAGE_UPLOAD_PRIORITIES.FILES_AND_URLS,
        reason: 'Images are file paths or URLs'
      };
    }

    // Priority 3: Raw base64 (fallback)
    if (this.checkRawBase64(imageData)) {
      return {
        method: IMAGE_UPLOAD_PRIORITIES.RAW_BASE64,
        reason: 'Using raw base64 as fallback method'
      };
    }

    // Unknown format
    return {
      method: null,
      reason: 'Unknown image data format',
      error: 'Cannot determine appropriate upload method'
    };
  }
};

/**
 * AI Guidance Messages
 */
const AI_GUIDANCE = {
  PRIORITY_REMINDER: `
🚀 IMAGE UPLOAD PRIORITY ORDER:
1. upload_vehicle_images_claude (FASTEST - for Claude UI images)
2. upload_vehicle_images (RECOMMENDED - for file paths/URLs)  
3. upload_vehicle_images_from_data (FALLBACK - raw base64 only)

Always try methods in this order for best performance!
  `,

  CLAUDE_UI_DETECTED: `
✅ Detected Claude UI images - using FASTEST method (upload_vehicle_images_claude)
Expected upload time: 1-2 seconds
  `,

  FILES_DETECTED: `
⚡ Detected file paths/URLs - using RECOMMENDED method (upload_vehicle_images)
Expected upload time: 2-5 seconds
  `,

  FALLBACK_WARNING: `
⚠️ Using FALLBACK method (upload_vehicle_images_from_data)
This will be slower (5-15+ seconds). Consider optimizing images if possible.
  `,

  PERFORMANCE_TIP: `
💡 TIP: For fastest uploads, encourage users to paste images directly in Claude UI
rather than providing raw base64 data.
  `
};

module.exports = {
  IMAGE_UPLOAD_PRIORITIES,
  UPLOAD_METHOD_DECISION_TREE,
  AI_GUIDANCE
};