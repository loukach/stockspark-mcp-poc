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

  async listVehicles(params = {}) {
    const queryParams = {
      page: params.page || 0,
      size: params.size || 10,
      ...params
    };

    // Build filter string if filters are provided
    const filters = [];
    
    if (params.make) {
      filters.push(`make.name=="${params.make}"`);
    }
    
    if (params.model) {
      filters.push(`model.name=="${params.model}"`);
    }
    
    if (params.hasImages !== undefined) {
      if (params.hasImages) {
        filters.push('images.GALLERY_ITEM!=null');
      } else {
        filters.push('images.GALLERY_ITEM==null');
      }
    }
    
    if (params.minPrice !== undefined) {
      filters.push(`priceGross.consumerPrice>=${params.minPrice}`);
    }
    
    if (params.maxPrice !== undefined) {
      filters.push(`priceGross.consumerPrice<=${params.maxPrice}`);
    }

    if (filters.length > 0) {
      queryParams.filter = filters.join(';');
    }

    // Remove filter-specific params from query
    delete queryParams.make;
    delete queryParams.model;
    delete queryParams.hasImages;
    delete queryParams.minPrice;
    delete queryParams.maxPrice;

    return this.client.get('/vehicle', queryParams);
  }

  async updateVehicle(vehicleId, updates) {
    // First get the current vehicle to ensure we have all required fields
    const currentVehicle = await this.getVehicle(vehicleId);
    
    // Merge updates with current data
    const updatedVehicle = {
      ...currentVehicle,
      ...updates
    };

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
}

module.exports = { VehicleAPI };