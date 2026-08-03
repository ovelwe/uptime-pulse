import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import * as metricsService_1 from './metrics.service';

@Controller('metrics')
export class MetricsController {
    constructor(private readonly metricsService: metricsService_1.MetricsService) {
    }

    @EventPattern('metric_created')
    async handleMetricEvent(@Payload() dto: metricsService_1.CreateMetricDto) {
        console.log(`Метрика из RabbitMQ: ${dto.url} (${dto.responseTime}ms)`);
        await this.metricsService.create(dto);
    }

    @Post()
    async create(@Body() dto: metricsService_1.CreateMetricDto) {
        return this.metricsService.create(dto);
    }

    @Get()
    async getMetrics(@Query('url') url?: string) {
        if (url) {
            return this.metricsService.findByUrl(url);
        }
        return this.metricsService.getUniqueUrls();
    }
}