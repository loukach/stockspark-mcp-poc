#!/usr/bin/env node

/**
 * Unit Test: Image Management Tools
 * Tests image upload, management, and deletion functionality
 */

const { TestUtils, TEST_DATA } = require('../config/test-config');

// Mock image data for testing
const MOCK_IMAGE_DATA = {
  validImageUrl: 'https://example.com/test-vehicle-image.jpg',
  invalidImageUrl: 'https://invalid-domain-that-does-not-exist.com/image.jpg',
  localImagePath: '/tmp/test-image.jpg' // Would need actual file for full test
};

async function testImageTools() {
  console.log('📸 Testing Image Management Tools...\n');
  
  TestUtils.setupEnvironment();
  
  try {
    const { imageAPI, vehicleAPI } = await TestUtils.createClients();
    
    // First, create a test vehicle to use for image operations
    console.log('Creating test vehicle for image operations...');
    const vehicleData = {
      ...TEST_DATA.workingVehiclePayload,
      ...TestUtils.generateUniqueTestData({
        price: 25000,
        mileage: 50000
      })
    };
    
    const creationResult = await vehicleAPI.addVehicle(vehicleData);
    const testVehicleId = creationResult.vehicleId;
    
    TestUtils.formatTestResult(
      'Create Test Vehicle',
      !!testVehicleId,
      testVehicleId ? `Created vehicle ID: ${testVehicleId}` : 'Failed to create test vehicle'
    );
    
    if (!testVehicleId) return false;
    
    // Test 1: Get initial images (should be empty)
    console.log('\nTest 1: Get initial vehicle images...');
    const initialImages = await imageAPI.getVehicleImages(testVehicleId);
    
    TestUtils.formatTestResult(
      'Get Initial Images',
      Array.isArray(initialImages.images),
      `Found ${initialImages.images?.length || 0} initial images`
    );
    
    // Test 2: Upload single image from URL (if available)
    console.log('\nTest 2: Upload image from URL...');
    try {
      const uploadResult = await imageAPI.uploadImageFromUrl(testVehicleId, MOCK_IMAGE_DATA.validImageUrl, false);
      
      TestUtils.formatTestResult(
        'Upload Image from URL',
        uploadResult.success !== false,
        uploadResult.message || `Image upload attempted`
      );
    } catch (error) {
      TestUtils.formatTestResult(
        'Upload Image from URL',
        false,
        `Upload failed: ${error.message} (may be expected if URL is mock)`
      );
    }
    
    // Test 3: Get images after upload
    console.log('\nTest 3: Get images after upload...');
    const afterUploadImages = await imageAPI.getVehicleImages(testVehicleId);
    
    TestUtils.formatTestResult(
      'Get Images After Upload',
      Array.isArray(afterUploadImages.images),
      `Found ${afterUploadImages.images?.length || 0} images after upload`
    );
    
    // Test 4: Set main image (if images exist)
    if (afterUploadImages.images && afterUploadImages.images.length > 0) {
      console.log('\nTest 4: Set main image...');
      const firstImageId = afterUploadImages.images[0].id;
      
      try {
        const setMainResult = await imageAPI.setMainImage(testVehicleId, firstImageId);
        
        TestUtils.formatTestResult(
          'Set Main Image',
          setMainResult.success !== false,
          `Set image ${firstImageId} as main image`
        );
      } catch (error) {
        TestUtils.formatTestResult(
          'Set Main Image',
          false,
          `Failed to set main image: ${error.message}`
        );
      }
      
      // Test 5: Delete image
      console.log('\nTest 5: Delete image...');
      try {
        const deleteResult = await imageAPI.deleteImage(testVehicleId, firstImageId);
        
        TestUtils.formatTestResult(
          'Delete Image',
          deleteResult.success !== false,
          `Deleted image ${firstImageId}`
        );
      } catch (error) {
        TestUtils.formatTestResult(
          'Delete Image',
          false,
          `Failed to delete image: ${error.message}`
        );
      }
    } else {
      console.log('\nSkipping main image and delete tests - no images available');
    }
    
    // Test 6: Handle invalid operations
    console.log('\nTest 6: Error handling...');
    try {
      await imageAPI.getVehicleImages(999999); // Non-existent vehicle
      TestUtils.formatTestResult('Error Handling', false, 'Should have thrown error for invalid vehicle');
    } catch (error) {
      TestUtils.formatTestResult(
        'Error Handling',
        true,
        `Properly handled invalid vehicle ID: ${error.message}`
      );
    }
    
    console.log('\n✅ Image tools tests completed');
    return true;
    
  } catch (error) {
    TestUtils.formatTestResult('Image Tools Test', false, error.message);
    console.log('\n❌ Image tools tests failed');
    return false;
  }
}

if (require.main === module) {
  testImageTools().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testImageTools };