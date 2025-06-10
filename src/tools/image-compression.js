/**
 * Image Compression and Optimization Tools
 * Reduces base64 image sizes for better performance
 */

/**
 * Compress/optimize image for vehicle uploads
 * This would be called by AI agents before uploading
 */
const imageCompressionTool = {
  name: "compress_image_for_upload",
  description: "Compress and optimize an image before uploading to reduce size and improve performance. Automatically resizes large images and optimizes quality for vehicle photos.",
  inputSchema: {
    type: "object",
    properties: {
      imageData: {
        type: "string", 
        description: "Base64 encoded image data to compress"
      },
      mimeType: {
        type: "string",
        description: "Original MIME type (e.g., image/jpeg, image/png)"
      },
      maxWidth: {
        type: "number",
        default: 1200,
        description: "Maximum width in pixels (default: 1200px for vehicle photos)"
      },
      maxHeight: {
        type: "number", 
        default: 800,
        description: "Maximum height in pixels (default: 800px for vehicle photos)"
      },
      quality: {
        type: "number",
        default: 0.8,
        description: "JPEG quality (0.1-1.0, default: 0.8 for good quality/size balance)"
      }
    },
    required: ["imageData", "mimeType"]
  }
};

/**
 * Simple client-side image compression (browser-based)
 * This could be implemented in the AI agent UI
 */
function compressImageClientSide(file, maxWidth = 1200, maxHeight = 800, quality = 0.8) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = function() {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }
      
      // Set canvas size
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to compressed base64
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64Data = compressedDataUrl.split(',')[1];
      
      resolve({
        data: base64Data,
        mimeType: 'image/jpeg',
        originalSize: file.size,
        compressedSize: base64Data.length * 0.75, // Approximate
        dimensions: { width, height }
      });
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Server-side image compression using sharp (if available)
 */
async function compressImageServerSide(base64Data, mimeType, options = {}) {
  const {
    maxWidth = 1200,
    maxHeight = 800,
    quality = 80
  } = options;
  
  try {
    // Try to use sharp if available
    const sharp = require('sharp');
    
    // Convert base64 to buffer
    const inputBuffer = Buffer.from(base64Data, 'base64');
    
    // Compress and resize
    const outputBuffer = await sharp(inputBuffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality })
      .toBuffer();
    
    const compressedBase64 = outputBuffer.toString('base64');
    
    return {
      success: true,
      data: compressedBase64,
      mimeType: 'image/jpeg',
      originalSize: inputBuffer.length,
      compressedSize: outputBuffer.length,
      compressionRatio: ((inputBuffer.length - outputBuffer.length) / inputBuffer.length * 100).toFixed(1)
    };
    
  } catch (error) {
    // Fallback: just validate size limits
    const buffer = Buffer.from(base64Data, 'base64');
    
    if (buffer.length > 2 * 1024 * 1024) {
      return {
        success: false,
        error: 'Image too large and compression not available. Please resize manually or install sharp package.',
        originalSize: buffer.length
      };
    }
    
    return {
      success: true,
      data: base64Data,
      mimeType,
      originalSize: buffer.length,
      compressedSize: buffer.length,
      compressionRatio: '0'
    };
  }
}

module.exports = {
  imageCompressionTool,
  compressImageClientSide,
  compressImageServerSide
};