import { Injectable } from '@nestjs/common';
import { ApiError, apiErrors } from '../../shared/http/api-error';
import { paginate } from '../../shared/http/pagination';
import type { CreatePropertyDto, PropertyQueryDto } from './dtos/property.dto';
import { PropertyEntity } from './property.entity';
import { PropertyRepository } from './property.repository';

@Injectable()
export class PropertyService {
  constructor(private readonly properties: PropertyRepository) {}

  create(input: CreatePropertyDto): Promise<PropertyEntity> {
    return this.properties.insert(input);
  }

  async get(id: string): Promise<PropertyEntity> {
    const property = await this.properties.findById(id);
    if (!property) throw new ApiError(apiErrors.propertyNotFound);
    return property;
  }

  async list(query: PropertyQueryDto) {
    const [data, total] = await this.properties.list(query);
    return paginate(data, total, query);
  }
}
