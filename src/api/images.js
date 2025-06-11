const fetch = require('node-fetch');
const fs = require('fs');
const FormData = require('form-data');
const { API, DEFAULTS } = require('../config/constants');

class ImageAPI {
  constructor(client) {
    this.client = client;
  }

  // Validate image URL
  validateImageUrl(url) {
    try {
      const parsed = new URL(url);
      // Check protocol
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error(`Invalid protocol: ${parsed.protocol}`);
      }
      // Check for common image extensions
      const pathname = parsed.pathname.toLowerCase();
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
      const hasValidExtension = validExtensions.some(ext => pathname.endsWith(ext));
      
      if (!hasValidExtension && !pathname.includes('/image')) {
        console.warn(`Warning: URL may not be an image: ${url}`);
      }
      
      return true;
    } catch (error) {
      throw new Error(`Invalid image URL: ${url} - ${error.message}`);
    }
  }

  async uploadImages(vehicleId, imageInputs, mainImageIndex = 0) {
    const uploadedImages = [];
    const errors = [];

    // Upload each image - handle both file paths and URLs
    for (let i = 0; i < imageInputs.length; i++) {
      const imageInput = imageInputs[i];
      
      try {
        let result;
        
        // Handle different input types
        if (typeof imageInput === 'string') {
          // File path or URL
          if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
            // URL
            result = await this.uploadImageFromUrl(vehicleId, imageInput, i === mainImageIndex);
          } else {
            // File path
            if (!fs.existsSync(imageInput)) {
              throw new Error(`File not found: ${imageInput}`);
            }

            // Create form data
            const form = new FormData();
            form.append('file', fs.createReadStream(imageInput));
            
            // Upload the image
            const token = await this.client.auth.getToken();
            const country = process.env.STOCKSPARK_COUNTRY || DEFAULTS.COUNTRY;
            const url = `${API.BASE_URL}/${country}/vehicle/${vehicleId}/images/gallery/upload`;
            
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                ...form.getHeaders()
              },
              body: form
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const uploadResult = await response.json();
            result = {
              success: true,
              imageId: uploadResult.id || uploadResult.imageId,
              path: imageInput
            };

            // If this is the main image, set it as main
            if (i === mainImageIndex && uploadResult.id) {
              await this.setMainImage(vehicleId, uploadResult.id);
            }
          }
        } else if (imageInput.type === 'resource') {
          // Base64 data
          result = await this.uploadImageFromBase64(
            vehicleId,
            imageInput.data,
            imageInput.mimeType,
            imageInput.filename,
            i === mainImageIndex
          );
        }
        
        if (result.success) {
          uploadedImages.push({
            ...result,
            index: i,
            main: i === mainImageIndex
          });
        } else {
          errors.push({
            path: imageInput.path || imageInput.uri || `input_${i}`,
            error: result.error
          });
        }

      } catch (error) {
        errors.push({
          path: typeof imageInput === 'string' ? imageInput : imageInput.uri || `input_${i}`,
          error: error.message
        });
      }
    }

    return {
      vehicleId,
      uploadedCount: uploadedImages.length,
      uploadedImages,
      errors,
      success: errors.length === 0
    };
  }

  async uploadImageFromUrl(vehicleId, imageUrl, setAsMain = false) {
    try {
      // Download image first
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.status}`);
      }

      const buffer = await imageResponse.buffer();
      
      // Create form data with buffer
      const form = new FormData();
      const filename = imageUrl.split('/').pop() || 'image.jpg';
      form.append('file', buffer, { filename });
      
      // Upload the image
      const token = await this.client.auth.getToken();
      const url = `${API.BASE_URL}/${process.env.STOCKSPARK_COUNTRY || DEFAULTS.COUNTRY}/vehicle/${vehicleId}/images/gallery/upload`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          ...form.getHeaders()
        },
        body: form
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      
      // If requested, set as main image
      if (setAsMain && result.id) {
        await this.setMainImage(vehicleId, result.id);
      }

      return {
        success: true,
        imageId: result.id || result.imageId,
        url: imageUrl
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        url: imageUrl
      };
    }
  }

  async uploadImageFromBase64(vehicleId, base64Data, mimeType, filename = 'image.jpg', setAsMain = false) {
    try {
      // Validate inputs
      if (!base64Data || typeof base64Data !== 'string') {
        throw new Error('Invalid base64 data: must be a non-empty string');
      }
      
      if (!mimeType || !mimeType.startsWith('image/')) {
        throw new Error('Invalid MIME type: must be an image type (e.g., image/png, image/jpeg)');
      }
      
      // Remove data URL prefix if present
      const cleanBase64 = base64Data.replace(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/, '');
      
      // Validate base64 format
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) {
        throw new Error('Invalid base64 format: contains invalid characters');
      }
      
      // Check minimum length (a 1x1 pixel image should be at least 50 chars)
      if (cleanBase64.length < 20) {
        throw new Error('Invalid base64 data: too short to be a valid image');
      }
      
      // Convert base64 to buffer
      const buffer = Buffer.from(cleanBase64, 'base64');
      
      // Validate buffer size
      if (buffer.length === 0) {
        throw new Error('Invalid base64 data: decoded to empty buffer');
      }
      
      // Check file size limits (2MB max for better performance)
      if (buffer.length > 2 * 1024 * 1024) {
        throw new Error('Image too large: maximum size is 2MB for optimal performance. Consider resizing the image.');
      }
      
      // Log image size for debugging
      const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
      console.log(`📸 Processing image: ${sizeMB}MB (${filename})`);
      
      // Create form data with buffer
      const form = new FormData();
      form.append('file', buffer, { 
        filename: filename || 'image.jpg',
        contentType: mimeType || 'image/jpeg'
      });
      
      // Upload the image
      const token = await this.client.auth.getToken();
      const url = `${API.BASE_URL}/${process.env.STOCKSPARK_COUNTRY || DEFAULTS.COUNTRY}/vehicle/${vehicleId}/images/gallery/upload`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          ...form.getHeaders()
        },
        body: form
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      
      // If requested, set as main image
      if (setAsMain && result.id) {
        await this.setMainImage(vehicleId, result.id);
      }

      return {
        success: true,
        imageId: result.id || result.imageId,
        filename: filename
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        filename: filename
      };
    }
  }

  async uploadImagesFromData(vehicleId, imageDataArray, mainImageIndex = 0) {
    // Validate inputs
    if (!Array.isArray(imageDataArray)) {
      throw new Error('imageDataArray must be an array');
    }
    
    if (imageDataArray.length === 0) {
      throw new Error('imageDataArray cannot be empty');
    }
    
    if (imageDataArray.length > 50) {
      throw new Error('Too many images: maximum 50 images per upload');
    }
    
    if (mainImageIndex < 0 || mainImageIndex >= imageDataArray.length) {
      throw new Error(`Invalid mainImageIndex: must be between 0 and ${imageDataArray.length - 1}`);
    }

    const uploadedImages = [];
    const errors = [];

    for (let i = 0; i < imageDataArray.length; i++) {
      const imageData = imageDataArray[i];
      const isMain = i === mainImageIndex;
      
      try {
        // Validate individual image data object
        if (!imageData || typeof imageData !== 'object') {
          throw new Error(`Image ${i + 1}: imageData must be an object`);
        }
        
        if (!imageData.data) {
          throw new Error(`Image ${i + 1}: missing 'data' field`);
        }
        
        if (!imageData.mimeType) {
          throw new Error(`Image ${i + 1}: missing 'mimeType' field`);
        }
        const result = await this.uploadImageFromBase64(
          vehicleId,
          imageData.data,
          imageData.mimeType,
          imageData.filename || `image_${i + 1}.${imageData.mimeType.split('/')[1]}`,
          isMain
        );
        
        if (result.success) {
          uploadedImages.push({
            ...result,
            index: i,
            main: isMain
          });
        } else {
          errors.push({
            index: i,
            error: result.error
          });
        }
      } catch (error) {
        errors.push({
          index: i,
          error: error.message
        });
      }
    }

    return {
      vehicleId,
      uploadedCount: uploadedImages.length,
      uploadedImages,
      errors,
      success: errors.length === 0
    };
  }

  async getVehicleImages(vehicleId) {
    const vehicle = await this.client.get(`/vehicle/${vehicleId}`);
    const images = vehicle.images?.GALLERY_ITEM || [];
    
    return {
      vehicleId,
      imageCount: images.length,
      images: images.map((img, index) => ({
        id: img.id || index,
        url: img.url || img,
        index: img.index || index + 1,
        main: img.main || false,
        type: img.type || "GALLERY_ITEM"
      })),
      hasImages: images.length > 0
    };
  }

  async deleteImage(vehicleId, imageId) {
    const vehicle = await this.client.get(`/vehicle/${vehicleId}`);
    
    if (!vehicle.images?.GALLERY_ITEM) {
      throw new Error('No images found for this vehicle');
    }

    const initialCount = vehicle.images.GALLERY_ITEM.length;
    
    // Filter out the image
    vehicle.images.GALLERY_ITEM = vehicle.images.GALLERY_ITEM.filter(
      img => (img.id || `image_${vehicle.images.GALLERY_ITEM.indexOf(img)}`) !== imageId
    );

    if (vehicle.images.GALLERY_ITEM.length === initialCount) {
      throw new Error(`Image with ID ${imageId} not found`);
    }

    // Update vehicle
    await this.client.put(`/vehicle/${vehicleId}`, vehicle);

    return {
      vehicleId,
      deletedImageId: imageId,
      remainingImages: vehicle.images.GALLERY_ITEM.length
    };
  }

  async setMainImage(vehicleId, imageId) {
    const vehicle = await this.client.get(`/vehicle/${vehicleId}`);
    
    if (!vehicle.images?.GALLERY_ITEM || vehicle.images.GALLERY_ITEM.length === 0) {
      throw new Error('No images found for this vehicle');
    }

    let imageFound = false;

    // Update main image status
    vehicle.images.GALLERY_ITEM.forEach((img, index) => {
      const currentId = img.id?.toString() || index.toString();
      if (currentId === imageId.toString()) {
        img.main = true;
        imageFound = true;
      } else {
        img.main = false;
      }
    });

    if (!imageFound) {
      throw new Error(`Image with ID ${imageId} not found`);
    }

    // Update vehicle
    await this.client.put(`/vehicle/${vehicleId}`, vehicle);

    return {
      vehicleId,
      mainImageId: imageId,
      success: true
    };
  }

  async reorderImages(vehicleId, imageIds) {
    const vehicle = await this.client.get(`/vehicle/${vehicleId}`);
    
    if (!vehicle.images?.GALLERY_ITEM) {
      throw new Error('No images found for this vehicle');
    }

    // Create a map of current images
    const imageMap = new Map();
    vehicle.images.GALLERY_ITEM.forEach((img, index) => {
      const id = img.id || `image_${index}`;
      imageMap.set(id, img);
    });

    // Reorder based on provided IDs
    const reorderedImages = [];
    imageIds.forEach((id, newPosition) => {
      const img = imageMap.get(id);
      if (img) {
        img.position = newPosition;
        reorderedImages.push(img);
      }
    });

    // Add any images not in the reorder list at the end
    vehicle.images.GALLERY_ITEM.forEach((img, index) => {
      const id = img.id || `image_${index}`;
      if (!imageIds.includes(id)) {
        img.position = reorderedImages.length;
        reorderedImages.push(img);
      }
    });

    vehicle.images.GALLERY_ITEM = reorderedImages;

    // Update vehicle
    await this.client.put(`/vehicle/${vehicleId}`, vehicle);

    return {
      vehicleId,
      reorderedCount: reorderedImages.length,
      success: true
    };
  }
}

module.exports = { ImageAPI };