import { Module } from '@nestjs/common';
import { PropertyController } from './property.controller';
import { PropertyService } from './property.service';
import { PropertyRepository } from './property.repository';

@Module({
  controllers: [PropertyController],
  providers: [PropertyService, PropertyRepository],
  exports: [PropertyRepository],
})
export class PropertyModule {}
