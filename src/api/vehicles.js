class VehicleAPI {
  constructor(client) {
    this.client = client;
  }

  async addVehicle(vehicleData) {
    return this.client.post('/vehicle', vehicleData);
  }

  async getVehicle(vehicleId) {
    return this.client.get(`/vehicle/${vehicleId}`);
  }

  /**
   * List vehicles with enhanced filtering and sorting capabilities
   * 
   * IMPORTANT: Make and model parameters must be passed as direct query parameters 
   * with numeric IDs, not as filters. This method auto-resolves names to IDs.
   * 
   * @param {Object} params - Search parameters
   * @param {string} params.make - Make name (auto-resolved to ID)
   * @param {string} params.model - Model name (auto-resolved to ID)  
   * @param {string} params.sort - Format: "field:direction" (e.g. "creationDate:desc")
   * @param {ReferenceAPI} referenceAPI - Reference API for name-to-ID resolution
   * @returns {Promise<Object>} Vehicle list response
   */
  async listVehicles(params = {}, referenceAPI = null) {
    const queryParams = {
      page: params.page || 0,
      size: params.size || 10,
      withGallery: true
    };

    // Handle make filtering - resolve name to ID and use as query parameter
    // API expects: ?make=6 (not filter=make.name=="Mercedes-Benz")
    if (params.make && referenceAPI) {
      try {
        const makesResult = await referenceAPI.getVehicleMakes('it', 'car');
        const make = makesResult.makes.find(m => 
          m.name.toLowerCase() === params.make.toLowerCase()
        );
        if (make) {
          queryParams.make = make.id;  // Use direct parameter, not filter
        }
      } catch (error) {
        // If reference lookup fails, skip make filtering
        console.warn('Failed to resolve make name to ID:', error.message);
      }
    }
    
    // Handle model filtering - resolve name to ID and use as query parameter
    if (params.model && referenceAPI) {
      try {
        // We need the make first to get models
        if (params.make) {
          const modelsResult = await referenceAPI.getVehicleModels('it', 'car', params.make);
          const model = modelsResult.models.find(m => 
            m.name.toLowerCase() === params.model.toLowerCase()
          );
          if (model) {
            queryParams.model = model.id;  // Use direct parameter, not filter
          }
        }
      } catch (error) {
        // If reference lookup fails, skip model filtering
        console.warn('Failed to resolve model name to ID:', error.message);
      }
    }

    // Build filter string for other filters
    const filters = [];
    
    if (params.modelName) {
      filters.push(`modelName=="${params.modelName}"`);
    }
    
    if (params.numberPlate) {
      filters.push(`numberPlate=="${params.numberPlate}"`);
    }
    
    if (params.vehicleType) {
      filters.push(`vehicleType=="${params.vehicleType}"`);
    }
    
    if (params.hasImages !== undefined) {
      queryParams.hasImages = params.hasImages;
    }
    
    if (params.minPrice !== undefined) {
      filters.push(`priceGross.consumerPrice>=${params.minPrice}`);
    }
    
    if (params.maxPrice !== undefined) {
      filters.push(`priceGross.consumerPrice<=${params.maxPrice}`);
    }
    
    if (params.kmMin !== undefined) {
      filters.push(`mileage>=${params.kmMin}`);
    }
    
    if (params.kmMax !== undefined) {
      filters.push(`mileage<=${params.kmMax}`);
    }

    if (filters.length > 0) {
      queryParams.filter = filters.join(';');
    }

    // Handle sorting - convert from 'field:direction' to API format
    if (params.sort) {
      const [field, direction] = params.sort.split(':');
      queryParams.sort = `${field};${direction}`;
    }

    return this.client.get('/vehicle', queryParams);
  }

  async updateVehicle(vehicleId, updates) {
    // Get the current vehicle object
    const currentVehicle = await this.getVehicle(vehicleId);
    
    // Process updates with special handling for color
    const processedUpdates = { ...updates };
    
    // Handle color updates - need to update both color and colorBase
    if (processedUpdates.color) {
      try {
        // Get available colors to find the colorBase mapping
        const colorsResponse = await this.client.get('/refdata/colors');
        const colors = Array.isArray(colorsResponse) ? colorsResponse : (colorsResponse.values || []);
        
        // Find matching color
        const matchingColor = colors.find(c => 
          c.name.toLowerCase() === processedUpdates.color.toLowerCase() ||
          (c.description && c.description.toLowerCase() === processedUpdates.color.toLowerCase())
        );
        
        if (matchingColor) {
          // Set both color fields consistently
          processedUpdates.color = matchingColor.description || matchingColor.name;
          processedUpdates.colorBase = {
            name: matchingColor.name,
            description: matchingColor.description || matchingColor.name
          };
        } else {
          // If not found in reference data, use the provided color as-is
          // and clear colorBase to avoid inconsistency
          processedUpdates.colorBase = null;
        }
      } catch (error) {
        // If color lookup fails, proceed with just the color field
        // The API will validate it
        console.warn('Color lookup failed, using provided color as-is:', error.message);
      }
    }
    
    // Replace the updated fields
    const updatedVehicle = {
      ...currentVehicle,
      ...processedUpdates
    };

    // Send the complete vehicle object back
    return this.client.put(`/vehicle/${vehicleId}`, updatedVehicle);
  }

  async updateVehiclePrice(vehicleId, newPrice) {
    // Get current vehicle data
    const vehicle = await this.getVehicle(vehicleId);
    
    // Update price fields
    if (vehicle.priceGross) {
      vehicle.priceGross.consumerPrice = newPrice;
      if (vehicle.priceGross.listPrice) {
        // Update list price proportionally
        vehicle.priceGross.listPrice = Math.round(newPrice * 1.2);
      }
    }
    
    if (vehicle.priceNet) {
      vehicle.priceNet.consumerPrice = newPrice;
    }

    return this.client.put(`/vehicle/${vehicleId}`, vehicle);
  }

  async deleteVehicle(vehicleId) {
    return this.client.delete(`/vehicle/${vehicleId}`);
  }

  async getVehicleImages(vehicleId) {
    const vehicle = await this.getVehicle(vehicleId);
    return vehicle.images?.GALLERY_ITEM || [];
  }

  async searchVehicles(searchTerm) {
    // Search across multiple fields
    const filters = [
      `make.name=="${searchTerm}"`,
      `model.name=="${searchTerm}"`,
      `numberPlate=="${searchTerm}"`
    ].join(','); // OR operation

    return this.client.get('/vehicle', { 
      filter: filters,
      page: 0,
      size: 20
    });
  }

  async deleteVehicle(vehicleId) {
    // First get vehicle info for confirmation message
    const vehicle = await this.getVehicle(vehicleId);
    const vehicleInfo = `${vehicle.make?.name || 'Unknown'} ${vehicle.model?.name || 'Unknown'} (ID: ${vehicleId})`;
    
    // Delete the vehicle
    await this.client.delete(`/vehicle/${vehicleId}`);
    
    return {
      success: true,
      vehicleInfo,
      message: `Vehicle ${vehicleInfo} has been successfully deleted from the stock.`
    };
  }
}

module.exports = { VehicleAPI };