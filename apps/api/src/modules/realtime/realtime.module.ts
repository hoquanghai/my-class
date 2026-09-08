import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RunStateService } from '../runs/run-state.service.js';
import { RtGateway } from './rt.gateway.js';
import { RunBroadcaster } from './run-broadcaster.service.js';

@Global()
@Module({
  imports: [AuthModule],
  providers: [RunStateService, RunBroadcaster, RtGateway],
  exports: [RunBroadcaster, RunStateService],
})
export class RealtimeModule {}
