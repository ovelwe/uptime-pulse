import { Module } from '@nestjs/common';
import { TargetsService } from './targets.service';
import { TargetsController } from './targets.controller';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [TargetsController],
    providers: [TargetsService, PrismaService],
})
export class TargetsModule {}