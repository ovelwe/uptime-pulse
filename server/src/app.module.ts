import { Module } from '@nestjs/common';
import { MetricsModule } from './metrics/metrics.module';
import { TargetsModule } from './targets/targets.module';

@Module({
  imports: [MetricsModule, TargetsModule],
})
export class AppModule {}