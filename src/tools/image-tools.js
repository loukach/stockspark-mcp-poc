const imageTools = [
  {
    name: "upload_vehicle_images_claude",
    description: "🚀 PRIORITY METHOD: Upload images from Claude UI (FASTEST - use this first when users paste images). Pre-optimized by Claude for 70-90% faster uploads than other methods.",
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
    description: "⚡ RECOMMENDED: Upload images from file paths or URLs (use when you have file paths/URLs, not pasted images)",
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
    name: "upload_vehicle_images_claude",
    description: "🚀 FASTEST: Upload images from Claude UI using filesystem optimization. Automatically saves pasted images to temp files via filesystem MCP for 50-70% faster uploads than base64 methods.",
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
    name: "upload_vehicle_images_from_data", 
    description: "⚠️ FALLBACK ONLY: Upload from raw base64 data (SLOW - only use if filesystem-optimized methods fail). This method is 50-70% slower than upload_vehicle_images_claude.",
    inputSchema: {
      type: "object",
      properties: {
        vehicleId: { 
          type: "number",
          description: "Vehicle ID to upload images to"
        },
        imageData: {
          type: "array",
          items: {
            type: "object",
            properties: {
              data: { type: "string", description: "Base64 encoded image data" },
              mimeType: { type: "string", description: "MIME type (e.g., image/jpeg, image/png)" },
              filename: { type: "string", description: "Optional filename" }
            },
            required: ["data", "mimeType"]
          },
          description: "Array of base64 image data objects",
          minItems: 1,
          maxItems: 50
        },
        mainImageIndex: { 
          type: "number", 
          default: 0,
          description: "Index of the main image (0-based)"
        }
      },
      required: ["vehicleId", "imageData"]
    }
  },
  
  {
    name: "get_vehicle_images",
    description: "Get all images for a vehicle",
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
    description: "Delete a specific image from a vehicle",
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
    description: "Set a specific image as the main/primary image for a vehicle",
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