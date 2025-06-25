const imageTools = [
  {
    name: "upload_vehicle_images",
    description: `RECOMMENDED: Upload from file paths or URLs (2-5s per image)

When to use: Pre-existing files on disk or web URLs
Prerequisites: Vehicle must exist, valid file paths/URLs
Batch support: 1-50 images per call (optimal: 10-20)

Accepts: Local paths (/path/to/image.jpg), URLs (https://...)
Auto-main image: First image automatically set as main if vehicle has no images
Pro tip: For bulk uploads, prepare file list first`,
    inputSchema: {
      type: "object",
      properties: {
        vehicleId: { 
          type: "number",
          description: "Vehicle ID to upload images to"
        },
        images: { 
          type: "array", 
          items: { 
            oneOf: [
              { type: "string" },
              {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["resource"] },
                  uri: { type: "string" },
                  mimeType: { type: "string" },
                  data: { type: "string" }
                },
                required: ["type", "uri", "data"]
              }
            ]
          },
          description: "Array of file paths, image URLs, or MCP resources (base64 data) to upload",
          minItems: 1,
          maxItems: 50
        },
        mainImageIndex: { 
          type: "number", 
          default: 0,
          description: "Index of the main image (0-based)"
        }
      },
      required: ["vehicleId", "images"]
    }
  },
  
  {
    name: "get_vehicle_images",
    description: `Get all images for a vehicle

When to use: View current images before upload/delete operations
Prerequisites: Vehicle must exist
Returns: Array of image objects with IDs, URLs, and metadata
Next steps: set_main_image, delete_vehicle_image, or upload more`,
    inputSchema: {
      type: "object",
      properties: {
        vehicleId: { 
          type: "number",
          description: "Vehicle ID to get images from"
        }
      },
      required: ["vehicleId"]
    }
  },

  {
    name: "delete_vehicle_image",
    description: `Delete a specific image from a vehicle

When to use: Remove unwanted or duplicate images
Prerequisites: Image ID from get_vehicle_images
Warning: Cannot delete the last image if vehicle is published
Next steps: upload_vehicle_images or set_main_image`,
    inputSchema: {
      type: "object",
      properties: {
        vehicleId: { 
          type: "number",
          description: "Vehicle ID"
        },
        imageId: {
          type: "string",
          description: "Image ID to delete"
        }
      },
      required: ["vehicleId", "imageId"]
    }
  },

  {
    name: "set_vehicle_main_image",
    description: `Set a specific image as the main/primary image for a vehicle

When to use: Change which image shows first in listings
Prerequisites: Image ID from get_vehicle_images
Effect: Main image appears in search results and thumbnails
Pro tip: Choose the most attractive exterior front angle`,
    inputSchema: {
      type: "object",
      properties: {
        vehicleId: { 
          type: "number",
          description: "Vehicle ID"
        },
        imageId: {
          type: "string",
          description: "Image ID to set as main"
        }
      },
      required: ["vehicleId", "imageId"]
    }
  }
];

const imageHandlers = {
  upload_vehicle_images: async (args, { imageAPI, logger }) => {
    const { validateVehicleId, validateRequired } = require('../utils/errors');
    
    validateVehicleId(args.vehicleId);
    validateRequired(args.images, 'images');
    
    const images = args.images || [];
    const filePaths = [];
    const urls = [];
    
    // Separate file paths from URLs
    images.forEach(image => {
      if (typeof image === 'string') {
        if (image.startsWith('http://') || image.startsWith('https://')) {
          urls.push(image);
        } else {
          filePaths.push(image);
        }
      } else {
        // Handle MCP resource objects
        filePaths.push(image);
      }
    });
    
    let totalUploaded = 0;
    let allErrors = [];
    let message = '';
    
    // Upload file paths
    if (filePaths.length > 0) {
      const fileResult = await imageAPI.uploadImages(
        args.vehicleId, 
        filePaths, 
        args.mainImageIndex || 0
      );
      totalUploaded += fileResult.uploadedCount;
      allErrors = allErrors.concat(fileResult.errors);
      message += `📁 Files: Uploaded ${fileResult.uploadedCount}/${filePaths.length}\n`;
    }
    
    // Upload URLs
    for (const url of urls) {
      const urlResult = await imageAPI.uploadImageFromUrl(
        args.vehicleId,
        url,
        urls.indexOf(url) === (args.mainImageIndex || 0) - filePaths.length
      );
      if (urlResult.success) {
        totalUploaded++;
        message += `🌐 URL uploaded: ${url}\n`;
      } else {
        allErrors.push({ path: url, error: urlResult.error });
        message += `❌ URL failed: ${url} - ${urlResult.error}\n`;
      }
    }
    
    message = `✅ Total uploaded: ${totalUploaded}/${images.length} images to vehicle ${args.vehicleId}\n\n` + message;
    
    if (allErrors.length > 0) {
      message += `\n❌ Errors (${allErrors.length}):\n`;
      allErrors.forEach(err => {
        message += `- ${err.path}: ${err.error}\n`;
      });
    }

    // Check if vehicle needs a main image
    if (totalUploaded > 0) {
      const mainImageStatus = await imageAPI.checkMainImageStatus(args.vehicleId);
      if (!mainImageStatus.hasMainImage && mainImageStatus.firstImageId) {
        message += `\n💡 SUGGESTION: This vehicle has no main image set. Consider running:\n`;
        message += `   set_main_image(vehicleId=${args.vehicleId}, imageId="${mainImageStatus.firstImageId}")\n`;
        message += `   This will make the first image appear in listings and search results.`;
      }
    }
    
    return {
      content: [
        {
          type: 'text',
          text: message,
        },
      ],
    };
  },


  get_vehicle_images: async (args, { imageAPI }) => {
    const { validateVehicleId } = require('../utils/errors');
    
    validateVehicleId(args.vehicleId);
    
    const result = await imageAPI.getVehicleImages(args.vehicleId);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },

  delete_vehicle_image: async (args, { imageAPI }) => {
    const { validateVehicleId, validateRequired } = require('../utils/errors');
    
    validateVehicleId(args.vehicleId);
    validateRequired(args.imageId, 'imageId');
    
    try {
      const result = await imageAPI.deleteImage(args.vehicleId, args.imageId);
      return {
        content: [
          {
            type: 'text',
            text: `✅ Image ${args.imageId} deleted. Remaining images: ${result.remainingImages}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to delete image: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },

  set_vehicle_main_image: async (args, { imageAPI }) => {
    const { validateVehicleId, validateRequired } = require('../utils/errors');
    
    validateVehicleId(args.vehicleId);
    validateRequired(args.imageId, 'imageId');
    
    try {
      await imageAPI.setMainImage(args.vehicleId, args.imageId);
      return {
        content: [
          {
            type: 'text',
            text: `✅ Image ${args.imageId} set as main image for vehicle ${args.vehicleId}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to set main image: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
};

module.exports = { imageTools, imageHandlers };