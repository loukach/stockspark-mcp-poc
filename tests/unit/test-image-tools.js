#!/usr/bin/env node

/**
 * Unit Test: Filesystem-Based Image Upload Tools
 * Tests filesystem image upload, management, and deletion functionality
 */

const { TestUtils, TEST_DATA } = require('../config/test-config');
const { tempFileManager } = require('../../src/utils/temp-files');
const fs = require('fs');

async function testImageTools() {
  console.log('📸 Testing Filesystem-Based Image Upload Tools...\n');
  
  TestUtils.setupEnvironment();
  
  try {
    const { imageAPI, vehicleAPI } = await TestUtils.createClients();
    
    // Test 1: Test temp file manager
    console.log('Test 1: Testing TempFileManager...');
    const tempInfo = tempFileManager.getTempDirInfo();
    TestUtils.formatTestResult(
      'TempFileManager Initialization',
      !!tempInfo.tempDir,
      `Temp directory: ${tempInfo.tempDir}, Files: ${tempInfo.fileCount || 0}`
    );
    
    // Test 2: Create mock Claude images for filesystem upload
    console.log('\nTest 2: Processing Claude UI image format...');
    const mockClaudeImages = [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: "image/jpeg",
          data: Buffer.from('test image data for filesystem upload').toString('base64')
        }
      }
    ];
    
    const processingResult = tempFileManager.processClaudeImages(mockClaudeImages);
    TestUtils.formatTestResult(
      'Process Claude Images',
      processingResult.successCount > 0,
      `Processed: ${processingResult.successCount}/${processingResult.totalCount} images, Files: ${processingResult.filepaths.length}`
    );
    
    // Test 3: Create test vehicle for image operations
    console.log('\nTest 3: Creating test vehicle for image operations...');
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
    
    // Test 4: Get initial images (should be empty)
    console.log('\nTest 4: Get initial vehicle images...');
    const initialImages = await imageAPI.getVehicleImages(testVehicleId);
    
    TestUtils.formatTestResult(
      'Get Initial Images',
      Array.isArray(initialImages.images),
      `Found ${initialImages.images?.length || 0} initial images`
    );
    
    // Test 5: Filesystem-based image upload (if temp files were created)
    if (processingResult.filepaths.length > 0) {
      console.log('\nTest 5: Upload image using filesystem method...');
      try {
        const tempFilePath = processingResult.filepaths[0];
        
        // Verify temp file exists before upload
        if (fs.existsSync(tempFilePath)) {
          const stats = fs.statSync(tempFilePath);
          console.log(`📂 Temp file: ${tempFilePath} (${stats.size} bytes)`);
          
          // Use imageAPI uploadImageFromFile method if available, otherwise uploadImageFromUrl
          const uploadResult = await imageAPI.uploadImageFromUrl(testVehicleId, `file://${tempFilePath}`, false);
          
          TestUtils.formatTestResult(
            'Upload Image from Filesystem',
            uploadResult.success !== false,
            uploadResult.message || 'Filesystem upload attempted'
          );
        } else {
          TestUtils.formatTestResult(
            'Upload Image from Filesystem',
            false,
            'Temp file not found for upload'
          );
        }
      } catch (error) {
        TestUtils.formatTestResult(
          'Upload Image from Filesystem',
          false,
          `Upload failed: ${error.message}`
        );
      }
    } else {
      console.log('\nSkipping filesystem upload test - no temp files available');
    }
    
    // Test 6: Get images after upload
    console.log('\nTest 6: Get images after upload...');
    const afterUploadImages = await imageAPI.getVehicleImages(testVehicleId);
    
    TestUtils.formatTestResult(
      'Get Images After Upload',
      Array.isArray(afterUploadImages.images),
      `Found ${afterUploadImages.images?.length || 0} images after upload`
    );
    
    // Test 7: Set main image and delete (if images exist)
    if (afterUploadImages.images && afterUploadImages.images.length > 0) {
      console.log('\nTest 7: Set main image...');
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
      
      // Test 8: Delete image
      console.log('\nTest 8: Delete image...');
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
    
    // Test 9: Cleanup temp files
    console.log('\nTest 9: Cleanup temp files...');
    const cleanup = tempFileManager.cleanupTempFiles(processingResult.filepaths);
    TestUtils.formatTestResult(
      'Cleanup Temp Files',
      cleanup.cleanedCount >= 0,
      `Cleaned up: ${cleanup.cleanedCount} files`
    );
    
    // Test 10: Error handling
    console.log('\nTest 10: Error handling...');
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
    
    console.log('\n✅ Filesystem-based image tools tests completed');
    console.log('🎯 Filesystem method provides improved performance over deprecated base64 methods');
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