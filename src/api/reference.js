const { logger } = require('../utils/logger');

class ReferenceAPI {
  constructor(apiClient) {
    this.client = apiClient;
  }

  async getMakes(searchTerm = null) {
    try {
      const result = await this.client.get('/refdata/CAR/makes');
      let makes = result.values || [];
      
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        makes = makes.filter(make => 
          make.name.toLowerCase().includes(search)
        );
      }
      
      return {
        count: makes.length,
        makes: makes.map(make => ({
          id: make.id,
          code: make.name, // Use name as code since API doesn't provide code
          name: make.name
        }))
      };
    } catch (error) {
      logger.error('Failed to get makes', { error: error.message, searchTerm });
      throw error;
    }
  }

  async getModels(makeCode, searchTerm = null) {
    try {
      const result = await this.client.get(`/refdata/CAR/makes/${makeCode}/models`);
      let models = result.values || [];
      
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        models = models.filter(model => 
          model.name.toLowerCase().includes(search)
        );
      }
      
      return {
        make: makeCode,
        count: models.length,
        models: models.map(model => ({
          id: model.id,
          code: model.name, // Use name as code since API doesn't provide code
          name: model.name
        }))
      };
    } catch (error) {
      logger.error('Failed to get models', { error: error.message, makeCode, searchTerm });
      throw error;
    }
  }

  async getTrims(makeCode, modelCode, searchTerm = null) {
    try {
      const result = await this.client.get(`/refdata/CAR/makes/${makeCode}/models/${modelCode}/variants`);
      let trims = result.values || [];
      
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        trims = trims.filter(trim => 
          trim.name.toLowerCase().includes(search)
        );
      }
      
      return {
        make: makeCode,
        model: modelCode,
        count: trims.length,
        trims: trims.map(trim => ({
          id: trim.id,
          source: trim.source,
          code: trim.code,
          name: trim.name,
          engineSize: trim.engineSize,
          power: trim.power,
          fuelType: trim.fuelType,
          make: trim.make
        }))
      };
    } catch (error) {
      logger.error('Failed to get trims', { error: error.message, makeCode, modelCode, searchTerm });
      throw error;
    }
  }

  async compileVehicleByVersion(companyId, providerCode, vehicleClass, provider = null) {
    try {
      const params = {
        companyId,
        providerCode,
        vehicleClass
      };
      
      if (provider) {
        params.provider = provider;
      }
      
      const result = await this.client.get('/vehicle/compileByTrim', params);
      return result;
    } catch (error) {
      logger.error('Failed to compile vehicle by version', { 
        error: error.message, 
        companyId, 
        providerCode, 
        vehicleClass, 
        provider 
      });
      throw error;
    }
  }

  async getFuelTypes() {
    try {
      const result = await this.client.get('/refdata/CAR/fuels');
      return {
        count: result.values.length,
        fuelTypes: result.values.map(fuel => ({
          code: fuel.code,
          name: fuel.name
        }))
      };
    } catch (error) {
      logger.error('Failed to get fuel types', { error: error.message });
      throw error;
    }
  }

  async getTransmissionTypes() {
    try {
      // For now, return static data since endpoint doesn't exist
      const transmissions = [
        { code: 'MANUAL', name: 'Manual' },
        { code: 'AUTOMATIC', name: 'Automatic' },
        { code: 'SEMI_AUTOMATIC', name: 'Semi-automatic' },
        { code: 'CVT', name: 'Continuously Variable Transmission' }
      ];
      
      return {
        count: transmissions.length,
        transmissionTypes: transmissions
      };
    } catch (error) {
      logger.error('Failed to get transmission types', { error: error.message });
      throw error;
    }
  }

  // Vehicle navigation functions
  async getVehicleMakes(country, vehicleClass = 'car') {
    try {
      const params = { vehicleClass };
      const result = await this.client.get('/vehicle/makes', params);
      
      // The API returns an array directly, not an object with 'makes' property
      const makes = Array.isArray(result) ? result : [];
      
      return {
        country,
        vehicleClass,
        count: makes.length,
        makes: makes.map(make => ({
          id: make.id,
          name: make.name,
          code: make.code || make.name
        }))
      };
    } catch (error) {
      logger.error('Failed to get vehicle makes', { error: error.message, country, vehicleClass });
      throw error;
    }
  }

  async getVehicleModels(country, vehicleClass, make) {
    try {
      const params = {
        vehicleClass: vehicleClass,
        make: make
      };
      
      const result = await this.client.get('/vehicle/models', params);
      
      // The API likely returns an array directly
      const models = Array.isArray(result) ? result : (result.models || []);
      
      return {
        country,
        vehicleClass,
        make,
        count: models.length,
        models: models.map(model => ({
          id: model.id,
          name: model.name,
          make: model.make,
          bodyType: model.bodyType,
          fuelType: model.fuelType,
          manufactureDate: model.manufactureDate
        }))
      };
    } catch (error) {
      logger.error('Failed to get vehicle models', { error: error.message, country, vehicleClass, make });
      throw error;
    }
  }

  async getVehicleBodies(country, vehicleClass = 'car') {
    try {
      const params = { vehicleClass };
      const result = await this.client.get('/vehicle/bodies', params);
      
      // The API likely returns an array directly
      const bodies = Array.isArray(result) ? result : (result.content || []);
      
      return {
        country,
        vehicleClass,
        count: bodies.length,
        bodies: bodies.map(body => ({
          id: body.id,
          name: body.name,
          key: body.key,
          code: body.code
        }))
      };
    } catch (error) {
      logger.error('Failed to get vehicle bodies', { error: error.message, country, vehicleClass });
      throw error;
    }
  }

  async getVehicleFuels(country, vehicleClass = 'car') {
    try {
      const params = { vehicleClass };
      const result = await this.client.get('/vehicle/fuels', params);
      
      // The API likely returns an array directly
      const fuels = Array.isArray(result) ? result : (result.content || []);
      
      return {
        country,
        vehicleClass,
        count: fuels.length,
        fuels: fuels.map(fuel => ({
          id: fuel.id,
          name: fuel.name,
          key: fuel.key,
          code: fuel.code
        }))
      };
    } catch (error) {
      logger.error('Failed to get vehicle fuels', { error: error.message, country, vehicleClass });
      throw error;
    }
  }

  async getVehicleTrims(country, modelId, bodyType = null, fuelType = null, manufactureDate = null) {
    try {
      const params = { 
        modelId,
        page: 0,
        size: 2147483647
      };
      if (bodyType) params.bodyType = bodyType;
      if (fuelType) params.fuelType = fuelType;
      if (manufactureDate) params.manufactureDate = manufactureDate;
      
      const result = await this.client.get('/vehicle/trims', params);
      
      // The API returns a paginated response with content array
      const trims = result.content || [];
      
      return {
        country,
        modelId,
        filters: { bodyType, fuelType, manufactureDate },
        count: trims.length,
        trims: trims.map(trim => ({
          id: trim.id,
          name: trim.name,
          source: trim.source,
          make: trim.make,
          model: trim.model,
          bodyType: trim.bodyType,
          fuelType: trim.fuelType,
          engineSize: trim.displacement,
          powerKw: trim.powerKw,
          powerHp: trim.powerHp,
          transmission: trim.gearType,
          listPrice: trim.listPrice,
          beginSelling: trim.beginSelling,
          endSelling: trim.endSelling
        }))
      };
    } catch (error) {
      logger.error('Failed to get vehicle trims', { error: error.message, country, modelId, bodyType, fuelType, manufactureDate });
      throw error;
    }
  }

  async findModelsByMake(country, makeName, vehicleClass = 'car') {
    try {
      // First get all models for the vehicle class and make
      const modelsResult = await this.getVehicleModels(country, vehicleClass, makeName);
      
      if (modelsResult.count === 0) {
        // Try fuzzy matching - get all makes first
        const makesResult = await this.getVehicleMakes(country);
        const fuzzyMake = makesResult.makes.find(make => 
          make.name.toLowerCase().includes(makeName.toLowerCase()) ||
          makeName.toLowerCase().includes(make.name.toLowerCase())
        );
        
        if (fuzzyMake) {
          logger.info(`Fuzzy matched "${makeName}" to "${fuzzyMake.name}"`);
          return await this.getVehicleModels(country, vehicleClass, fuzzyMake.name);
        }
      }
      
      return modelsResult;
    } catch (error) {
      logger.error('Failed to find models by make', { error: error.message, country, makeName, vehicleClass });
      throw error;
    }
  }

  async searchAll(query, type = 'all', limit = 20) {
    try {
      const results = {
        query,
        type,
        results: {
          makes: [],
          models: [],
          trims: []
        }
      };

      const search = query.toLowerCase();

      // Search makes
      if (type === 'all' || type === 'makes') {
        const makesResult = await this.getMakes(query);
        results.results.makes = makesResult.makes.slice(0, limit);
      }

      // Search models for matching makes
      if (type === 'all' || type === 'models' || type === 'trims') {
        const allMakes = await this.getMakes();
        const relevantMakes = allMakes.makes.filter(make => 
          make.name.toLowerCase().includes(search)
        ).slice(0, 5); // Limit to avoid too many API calls

        for (const make of relevantMakes) {
          try {
            if (type === 'all' || type === 'models') {
              const modelsResult = await this.getModels(make.code, query);
              results.results.models.push(...modelsResult.models.map(model => ({
                ...model,
                make: make.name
              })));
            }

            if (type === 'all' || type === 'trims') {
              const modelsResult = await this.getModels(make.code);
              const relevantModels = modelsResult.models.filter(model =>
                model.name.toLowerCase().includes(search)
              ).slice(0, 3);

              for (const model of relevantModels) {
                try {
                  const trimsResult = await this.getTrims(make.code, model.code, query);
                  results.results.trims.push(...trimsResult.trims.map(trim => ({
                    ...trim,
                    make: make.name,
                    model: model.name
                  })));
                } catch (trimError) {
                  // Continue if specific trim lookup fails
                  logger.debug('Trim lookup failed', { make: make.code, model: model.code });
                }
              }
            }
          } catch (modelError) {
            // Continue if specific model lookup fails
            logger.debug('Model lookup failed', { make: make.code });
          }
        }
      }

      // Apply limit to final results
      results.results.makes = results.results.makes.slice(0, limit);
      results.results.models = results.results.models.slice(0, limit);
      results.results.trims = results.results.trims.slice(0, limit);

      results.totalFound = 
        results.results.makes.length + 
        results.results.models.length + 
        results.results.trims.length;

      return results;
    } catch (error) {
      logger.error('Failed to search reference data', { error: error.message, query, type });
      throw error;
    }
  }
}

module.exports = { ReferenceAPI };