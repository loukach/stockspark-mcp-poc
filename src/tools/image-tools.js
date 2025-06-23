const imageTools = [
  {
    name: "upload_vehicle_images_claude",
    description: `FASTEST: Upload images pasted in Claude UI (1-2s per image)

Performance: 70-90% faster than base64 methods
When to use: ALWAYS when user pastes/drops images in Claude
Prerequisites: Vehicle must exist (use create_vehicle first)
Batch support: 1-10 images per call

Auto-optimization: Converts Claude UI images to temp files for speed
Requires: filesystem MCP to be installed`,
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
            type: "object",
            properties: {
              type: { type: "string", enum: ["image"] },
              source: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["base64"] },
                  media_type: { type: "string" },
                  data: { type: "string" }
                },
                required: ["type", "media_type", "data"]
              }
            },
            required: ["type", "source"]
          },
          description: "Array of Claude image objects with optimized data",
          minItems: 1,
          maxItems: 10
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
    name: "upload_vehicle_images",
    description: `RECOMMENDED: Upload from file paths or URLs (2-5s per image)

When to use: Pre-existing files on disk or web URLs
Prerequisites: Vehicle must exist, valid file paths/URLs
Batch support: 1-50 images per call (optimal: 10-20)

Accepts: Local paths (/path/to/image.jpg), URLs (https://...)
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
    name: "set_main_image",
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

module.exports = { imageTools };