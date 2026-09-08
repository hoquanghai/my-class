import { Global, Module } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service.js';
import { LimitsController } from './limits.controller.js';
import { LimitsService } from './limits.service.js';

@Global()
@Module({
  controllers: [LimitsController],
  providers: [FeatureFlagsService, LimitsService],
  exports: [FeatureFlagsService, LimitsService],
})
export class FeatureFlagsModule {}
