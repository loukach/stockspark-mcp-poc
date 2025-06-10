#!/usr/bin/env node
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { 
    testConnectionTool,
    addVehicleTool,
    getVehicleTool,
    listVehiclesTool,
    updateVehiclePriceTool,
    uploadVehicleImagesTool,
    getVehicleImagesTool,
    deleteVehicleImageTool,
    setMainImageTool,
    publishVehicleTool,
    unpublishVehicleTool,
    getPublicationStatusTool,
    listAvailablePortalsTool,
    getUnderperformingVehiclesTool,
    applyBulkDiscountTool,
    analyzeInventoryHealthTool,
    getPricingRecommendationsTool,
    startVehicleCreationTool,
    createVehicleFromTrimTool,
    getAvailableMakesTool,
    getVehicleMakesTool,
    getAvailableModelsTool,
    getVehicleModelsTool,
    getVehicleTrimsTool,
    findModelsByMakeTool,
    searchReferenceDataTool,
    compileVehicleByTrimTool,
    getFuelTypesTool,
    getTransmissionTypesTool,
    getVehicleBodiesTool,
    getVehicleFuelsTool
} = require('./src/tools/vehicle-tools');

async function simulateAIAgent() {
    console.log("=== AI Agent Simulation: Creating Mercedes-Benz S 500 2021 ===\n");

    try {
        // Step 1: Find Mercedes-Benz models
        console.log("Step 1: Starting vehicle creation - Finding Mercedes-Benz models");
        console.log("---------------------------------------------------------------");
        
        const step1Args = {
            make_name: "Mercedes-Benz"
        };
        
        console.log("Tool: start_vehicle_creation");
        console.log("Arguments:", JSON.stringify(step1Args, null, 2));
        
        const step1Result = await startVehicleCreationTool.handler(step1Args);
        console.log("\nResult:", JSON.stringify(step1Result, null, 2));
        
        // Extract S-Class model ID
        let sClassModelId = null;
        if (step1Result.models) {
            const sClass = step1Result.models.find(m => 
                m.name.includes('Classe S') || 
                m.name.includes('S-Class') ||
                m.name.includes('S Klasse')
            );
            if (sClass) {
                sClassModelId = sClass.id;
                console.log(`\n✓ Found S-Class model: ${sClass.name} (ID: ${sClassModelId})`);
            }
        }

        if (!sClassModelId) {
            throw new Error("Could not find S-Class model");
        }

        // Step 2: Find S 500 trim from 2021
        console.log("\n\nStep 2: Finding S 500 trim from 2021");
        console.log("-------------------------------------");
        
        const step2Args = {
            model_id: sClassModelId,
            manufacture_date: "01-2021"
        };
        
        console.log("Tool: get_vehicle_trims");
        console.log("Arguments:", JSON.stringify(step2Args, null, 2));
        
        const step2Result = await getVehicleTrimsTool.handler(step2Args);
        console.log("\nResult:", JSON.stringify(step2Result, null, 2));
        
        // Extract S 500 trim
        let s500Trim = null;
        if (step2Result.trims) {
            s500Trim = step2Result.trims.find(t => 
                t.name.includes('S 500') || 
                t.name.includes('S500')
            );
            if (s500Trim) {
                console.log(`\n✓ Found S 500 trim: ${s500Trim.name}`);
                console.log(`  ID: ${s500Trim.id}`);
                console.log(`  Source: ${s500Trim.source}`);
                console.log(`  Year: ${s500Trim.year}`);
                console.log(`  Engine: ${s500Trim.engine}`);
                console.log(`  Power: ${s500Trim.power}`);
            }
        }

        if (!s500Trim) {
            throw new Error("Could not find S 500 trim from 2021");
        }

        // Step 3: Create vehicle with specifications
        console.log("\n\nStep 3: Creating vehicle with specifications");
        console.log("-------------------------------------------");
        
        const step3Args = {
            providerCode: s500Trim.id,
            provider: s500Trim.source,
            vehicleClass: "car",
            price: 34000,
            mileage: 87000,
            color: "nero",
            condition: "USED"
        };
        
        console.log("Tool: create_vehicle_from_trim");
        console.log("Arguments:", JSON.stringify(step3Args, null, 2));
        
        const step3Result = await createVehicleFromTrimTool.handler(step3Args);
        console.log("\nResult:", JSON.stringify(step3Result, null, 2));
        
        // Display created vehicle info
        if (step3Result.vehicle) {
            console.log("\n✓ Vehicle created successfully!");
            console.log("\nCreated Vehicle Summary:");
            console.log("------------------------");
            console.log(`ID: ${step3Result.vehicle.id}`);
            console.log(`Brand: ${step3Result.vehicle.brand}`);
            console.log(`Model: ${step3Result.vehicle.model}`);
            console.log(`Trim: ${step3Result.vehicle.trim}`);
            console.log(`Year: ${step3Result.vehicle.year}`);
            console.log(`Price: €${step3Result.vehicle.price}`);
            console.log(`Mileage: ${step3Result.vehicle.mileage} km`);
            console.log(`Color: ${step3Result.vehicle.color}`);
            console.log(`Condition: ${step3Result.vehicle.condition}`);
            console.log(`Status: ${step3Result.vehicle.status}`);
            
            console.log("\n📋 Complete AI Agent Workflow:");
            console.log("1. Used start_vehicle_creation with brand 'Mercedes-Benz' to find models");
            console.log("2. Used get_vehicle_trims with model_id and manufacture_date '01-2021' to find S 500 trim");
            console.log("3. Used create_vehicle_from_trim with trim data and specifications:");
            console.log("   - Price: €34,000");
            console.log("   - Mileage: 87,000 km");
            console.log("   - Color: nero (black)");
            console.log("   - Condition: USED");
        }

        console.log("\n=== AI Agent Simulation Complete ===");

    } catch (error) {
        console.error("\n❌ Error:", error.message);
        if (error.response) {
            console.error("API Response:", error.response.data);
        }
    }
}

// Run the simulation
simulateAIAgent().catch(console.error);