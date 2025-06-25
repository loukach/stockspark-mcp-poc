const fetch = require('node-fetch');
const fs = require('fs');
const FormData = require('form-data');
const { logger } = require('../utils/logger');

class ImageAPI {
  constructor(client) {
    this.client = client;
  }


  async uploadImages(vehicleId, imageInputs, mainImageIndex = 0) {
    const uploadedImages = [];
    const errors = [];

    logger.info(`Starting batch image upload for vehicle ${vehicleId}`, {
      totalImages: imageInputs.length,
      mainImageIndex: mainImageIndex
    });

    // Check if vehicle has existing images to determine if we should auto-set main image
    let vehicleHasImages = false;
    try {
      const existingImages = await this.getVehicleImages(vehicleId);
      vehicleHasImages = existingImages.hasImages;
      logger.info(`Vehicle ${vehicleId} currently has ${existingImages.imageCount} images`, {
        hasImages: vehicleHasImages
      });
    } catch (error) {
      logger.warn(`Could not check existing images for vehicle ${vehicleId}:`, error.message);
      // Continue with upload anyway
    }

    // Upload each image - handle both file paths and URLs
    for (let i = 0; i < imageInputs.length; i++) {
      const imageInput = imageInputs[i];
      
      try {
        let result;
        
        // Handle different input types
        if (typeof imageInput === 'string') {
          // File path, URL, or data URI
          if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
            // URL
            result = await this.uploadImageFromUrl(vehicleId, imageInput, i === mainImageIndex);
          } else if (imageInput.startsWith('data:image/')) {
            // Data URI (MCP resource reference)
            result = await this.uploadImageFromDataUri(vehicleId, imageInput, i === mainImageIndex);
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
            const country = process.env.STOCKSPARK_COUNTRY || 'it';
            const url = `${process.env.STOCKSPARK_API_URL}/${country}/vehicle/${vehicleId}/images/gallery/upload`;
            
            logger.info(`Uploading image from file: ${imageInput} to vehicle ${vehicleId}`);
            logger.apiRequest('POST', url, { type: 'file_upload', filename: imageInput });
            
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                ...form.getHeaders()
              },
              body: form
            });

            logger.apiResponse(response.status, response.statusText, url);

            if (!response.ok) {
              const errorText = await response.text();
              logger.error(`Image upload failed for vehicle ${vehicleId}`, {
                status: response.status,
                statusText: response.statusText,
                error: errorText,
                filename: imageInput
              });
              throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const uploadResult = await response.json();
            logger.info(`Successfully uploaded image to vehicle ${vehicleId}`, {
              imageId: uploadResult.id || uploadResult.imageId,
              filename: imageInput
            });
            
            result = {
              success: true,
              imageId: uploadResult.id || uploadResult.imageId,
              path: imageInput
            };

            // Only set as main if explicitly requested via mainImageIndex
            if (i === mainImageIndex && uploadResult.id) {
              await this.setMainImage(vehicleId, uploadResult.id);
              logger.info(`Set image ${uploadResult.id} as main for vehicle ${vehicleId}`, {
                reason: 'specified_main_index'
              });
            }
          }
        }
        
        if (result.success) {
          const isMainImage = (i === mainImageIndex);
          uploadedImages.push({
            ...result,
            index: i,
            main: isMainImage
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

    const result = {
      vehicleId,
      uploadedCount: uploadedImages.length,
      uploadedImages,
      errors,
      success: errors.length === 0
    };

    logger.info(`Completed batch image upload for vehicle ${vehicleId}`, {
      totalRequested: imageInputs.length,
      successfulUploads: uploadedImages.length,
      failedUploads: errors.length,
      success: result.success
    });

    return result;
  }

  async checkMainImageStatus(vehicleId) {
    try {
      const imageInfo = await this.getVehicleImages(vehicleId);
      const hasMainImage = imageInfo.images.some(img => img.main === true);
      const firstImageId = imageInfo.images.length > 0 ? imageInfo.images[0].id : null;
      
      return {
        hasImages: imageInfo.hasImages,
        hasMainImage: hasMainImage,
        firstImageId: firstImageId,
        totalImages: imageInfo.imageCount
      };
    } catch (error) {
      logger.warn(`Failed to check main image status for vehicle ${vehicleId}:`, error.message);
      return {
        hasImages: false,
        hasMainImage: false,
        firstImageId: null,
        totalImages: 0
      };
    }
  }

  async uploadImageFromDataUri(vehicleId, dataUri, setAsMain = false) {
    try {
      // Parse data URI
      const matches = dataUri.match(/^data:image\/([^;]+);base64,(.+)$/);
      if (!matches) {
        throw new Error('Invalid data URI format');
      }
      
      const mimeType = `image/${matches[1]}`;
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Create form data with buffer
      const form = new FormData();
      const filename = `upload_${Date.now()}.${matches[1]}`;
      form.append('file', buffer, { filename, contentType: mimeType });
      
      // Upload the image
      const token = await this.client.auth.getToken();
      const country = process.env.STOCKSPARK_COUNTRY || 'it';
      const url = `${process.env.STOCKSPARK_API_URL}/${country}/vehicle/${vehicleId}/images/gallery/upload`;
      
      logger.info(`Uploading image from data URI to vehicle ${vehicleId}`, {
        size: buffer.length,
        type: mimeType
      });
      logger.apiRequest('POST', url, { type: 'data_uri_upload', size: buffer.length });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          ...form.getHeaders()
        },
        body: form
      });

      logger.apiResponse(response.status, response.statusText, url);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Data URI upload failed for vehicle ${vehicleId}`, {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          size: buffer.length
        });
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      logger.info(`Successfully uploaded data URI to vehicle ${vehicleId}`, {
        imageId: result.id || result.imageId,
        size: buffer.length
      });
      
      // If requested, set as main image
      if (setAsMain && result.id) {
        await this.setMainImage(vehicleId, result.id);
      }

      return {
        success: true,
        imageId: result.id || result.imageId,
        dataUri: `${dataUri.substring(0, 50)}...` // Truncated for logging
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        dataUri: `${dataUri.substring(0, 50)}...` // Truncated for logging
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
      const country = process.env.STOCKSPARK_COUNTRY || 'it';
      const url = `${process.env.STOCKSPARK_API_URL}/${country}/vehicle/${vehicleId}/images/gallery/upload`;
      
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

    // Check if vehicle has existing images to determine if we should auto-set main image
    let vehicleHasImages = false;
    try {
      const existingImages = await this.getVehicleImages(vehicleId);
      vehicleHasImages = existingImages.hasImages;
      logger.info(`Vehicle ${vehicleId} currently has ${existingImages.imageCount} images`, {
        hasImages: vehicleHasImages
      });
    } catch (error) {
      logger.warn(`Could not check existing images for vehicle ${vehicleId}:`, error.message);
      // Continue with upload anyway
    }

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
        // Only set as main if explicitly requested via mainImageIndex
        const isMainImage = (i === mainImageIndex);
        
        const result = await this.uploadImageFromBase64(
          vehicleId,
          imageData.data,
          imageData.mimeType,
          imageData.filename || `image_${i + 1}.${imageData.mimeType.split('/')[1]}`,
          isMainImage
        );
        
        if (result.success) {
          uploadedImages.push({
            ...result,
            index: i,
            main: isMainImage
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
      const country = process.env.STOCKSPARK_COUNTRY || 'it';
      const url = `${process.env.STOCKSPARK_API_URL}/${country}/vehicle/${vehicleId}/images/gallery/upload`;
      
      logger.info(`Uploading image from URL: ${imageUrl} to vehicle ${vehicleId}`);
      logger.apiRequest('POST', url, { type: 'url_upload', sourceUrl: imageUrl });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          ...form.getHeaders()
        },
        body: form
      });

      logger.apiResponse(response.status, response.statusText, url);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Image upload from URL failed for vehicle ${vehicleId}`, {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          sourceUrl: imageUrl
        });
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      logger.info(`Successfully uploaded image from URL to vehicle ${vehicleId}`, {
        imageId: result.id || result.imageId,
        sourceUrl: imageUrl
      });
      
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


  async getVehicleImages(vehicleId) {
    const vehicle = await this.client.get(`/vehicle/${vehicleId}?withGallery=true`);
    const images = vehicle.gallery || vehicle.images?.GALLERY_ITEM || [];
    
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
    const vehicle = await this.client.get(`/vehicle/${vehicleId}?withGallery=true`);
    
    const images = vehicle.gallery || vehicle.images?.GALLERY_ITEM || [];
    if (images.length === 0) {
      throw new Error('No images found for this vehicle');
    }

    const initialCount = images.length;
    
    // Filter out the image
    const filteredImages = images.filter(
      img => (img.id || `image_${images.indexOf(img)}`) !== imageId
    );

    if (filteredImages.length === initialCount) {
      throw new Error(`Image with ID ${imageId} not found`);
    }

    // Update the correct field based on API response structure
    if (vehicle.gallery) {
      vehicle.gallery = filteredImages;
    } else if (vehicle.images?.GALLERY_ITEM) {
      vehicle.images.GALLERY_ITEM = filteredImages;
    }

    // Update vehicle
    await this.client.put(`/vehicle/${vehicleId}`, vehicle);

    return {
      vehicleId,
      deletedImageId: imageId,
      remainingImages: filteredImages.length
    };
  }

  async setMainImage(vehicleId, imageId) {
    const vehicle = await this.client.get(`/vehicle/${vehicleId}?withGallery=true`);
    
    const images = vehicle.gallery || vehicle.images?.GALLERY_ITEM || [];
    if (images.length === 0) {
      throw new Error('No images found for this vehicle');
    }

    let imageFound = false;

    // Update main image status in gallery field
    images.forEach((img, index) => {
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

    // Update the correct field based on API response structure
    if (vehicle.gallery) {
      vehicle.gallery = images;
    } else if (vehicle.images?.GALLERY_ITEM) {
      vehicle.images.GALLERY_ITEM = images;
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
    const vehicle = await this.client.get(`/vehicle/${vehicleId}?withGallery=true`);
    
    const images = vehicle.gallery || vehicle.images?.GALLERY_ITEM || [];
    if (images.length === 0) {
      throw new Error('No images found for this vehicle');
    }

    // Create a map of current images
    const imageMap = new Map();
    images.forEach((img, index) => {
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
    images.forEach((img, index) => {
      const id = img.id || `image_${index}`;
      if (!imageIds.includes(id)) {
        img.position = reorderedImages.length;
        reorderedImages.push(img);
      }
    });

    // Update the correct field based on API response structure
    if (vehicle.gallery) {
      vehicle.gallery = reorderedImages;
    } else if (vehicle.images?.GALLERY_ITEM) {
      vehicle.images.GALLERY_ITEM = reorderedImages;
    }

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