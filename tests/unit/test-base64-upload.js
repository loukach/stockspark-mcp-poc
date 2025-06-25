#!/usr/bin/env node

/**
 * Unit Test: Base64 Image Upload for AI Agent UI
 * Tests the new upload_vehicle_images_from_data functionality
 */

const { TestUtils, TEST_DATA } = require('../config/test-config');

// Simple test image as base64 (1x1 red pixel PNG)
const TEST_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9h2/M8AAAAABJRU5ErkJggg==';

async function testBase64Upload() {
  console.log('🧪 Testing Base64 Image Upload (AI Agent UI Support)...\n');
  
  TestUtils.setupEnvironment();
  
  try {
    const { imageAPI, vehicleAPI } = await TestUtils.createClients();
    
    // Test 1: Create a test vehicle first
    console.log('Test 1: Create test vehicle for image upload...');
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
    
    // Test 2: Upload single base64 image
    console.log('\nTest 2: Upload single base64 image...');
    
    const imageData = [
      {
        data: TEST_IMAGE_BASE64,
        mimeType: 'image/png',
        filename: 'test_car_image.png'
      }
    ];
    
    const uploadResult = await imageAPI.uploadImagesFromData(testVehicleId, imageData, 0);
    
    TestUtils.formatTestResult(
      'Base64 Upload Single Image',
      uploadResult.success,
      uploadResult.success ? 
        `Uploaded ${uploadResult.uploadedCount} image(s): ${uploadResult.uploadedImages.map(img => img.filename).join(', ')}` :
        `Errors: ${uploadResult.errors.map(err => err.error).join(', ')}`
    );
    
    // Test 3: Upload multiple base64 images
    console.log('\nTest 3: Upload multiple base64 images...');
    
    const multipleImageData = [
      {
        data: TEST_IMAGE_BASE64,
        mimeType: 'image/png',
        filename: 'exterior_front.png'
      },
      {
        data: TEST_IMAGE_BASE64,
        mimeType: 'image/png', 
        filename: 'interior_dashboard.png'
      },
      {
        data: TEST_IMAGE_BASE64,
        mimeType: 'image/png',
        filename: 'exterior_side.png'
      }
    ];
    
    const multiUploadResult = await imageAPI.uploadImagesFromData(testVehicleId, multipleImageData, 1);
    
    TestUtils.formatTestResult(
      'Base64 Upload Multiple Images',
      multiUploadResult.success,
      multiUploadResult.success ?
        `Uploaded ${multiUploadResult.uploadedCount}/${multipleImageData.length} images. Main image: ${multiUploadResult.uploadedImages.find(img => img.main)?.filename || 'none'}` :
        `Errors: ${multiUploadResult.errors.map(err => err.error).join(', ')}`
    );
    
    // Test 4: Verify images were uploaded
    console.log('\nTest 4: Verify uploaded images...');
    
    const imagesResult = await imageAPI.getVehicleImages(testVehicleId);
    const totalImages = imagesResult.imageCount;
    
    TestUtils.formatTestResult(
      'Verify Uploaded Images',
      totalImages >= 1,
      `Vehicle ${testVehicleId} now has ${totalImages} image(s)`
    );
    
    // Test 5: Error handling - invalid base64
    console.log('\nTest 5: Test error handling with invalid base64...');
    
    const invalidImageData = [
      {
        data: 'invalid-base64-data-that-should-fail',
        mimeType: 'image/png',
        filename: 'invalid.png'
      }
    ];
    
    const errorResult = await imageAPI.uploadImagesFromData(testVehicleId, invalidImageData, 0);
    
    TestUtils.formatTestResult(
      'Error Handling Invalid Base64',
      !errorResult.success && errorResult.errors.length > 0,
      errorResult.success ? 
        'Unexpected success with invalid data' : 
        `Correctly handled error: ${errorResult.errors[0]?.error || 'unknown error'}`
    );
    
    // Test 6: Error handling - empty data
    console.log('\nTest 6: Test error handling with empty data...');
    
    try {
      const emptyResult = await imageAPI.uploadImagesFromData(testVehicleId, [], 0);
      TestUtils.formatTestResult(
        'Error Handling Empty Data',
        !emptyResult.success,
        'Correctly handled empty image data'
      );
    } catch (error) {
      TestUtils.formatTestResult(
        'Error Handling Empty Data',
        true,
        `Correctly threw error: ${error.message}`
      );
    }
    
    console.log('\n✅ Base64 image upload tests completed');
    console.log('\nUsage for AI agents:');
    console.log('When users paste images in Claude UI:');
    console.log('1. Extract base64 data from pasted images');
    console.log('2. Call upload_vehicle_images_from_data with imageData array');
    console.log('3. Each imageData item needs: { data, mimeType, filename }');
    console.log('4. Set mainImageIndex to designate main image');
    
    return true;
    
  } catch (error) {
    TestUtils.formatTestResult('Base64 Upload Test', false, error.message);
    console.log('\n❌ Base64 upload tests failed');
    console.log('Error details:', error.message);
    
    if (error.message.includes('401') || error.message.includes('authentication')) {
      console.log('\n💡 Authentication issue - check credentials in test-config.js');
    }
    
    return false;
  }
}

if (require.main === module) {
  testBase64Upload().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testBase64Upload };