import { Controller, Get, Post, Body, Query, Sse, MessageEvent } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { MetricsService, CreateMetricDto } from './metrics.service';
import { Observable, map } from 'rxjs';

@Controller('metrics')
export class MetricsController {
    constructor(private readonly metricsService: MetricsService) {}

    @EventPattern('metric_created')
    async handleMetricEvent(@Payload() dto: CreateMetricDto) {
        console.log(`Получена метрика из RabbitMQ: ${dto.url} (${dto.responseTime}ms)`);
        await this.metricsService.create(dto);
    }

    @Sse('stream')
    streamMetrics(): Observable<MessageEvent> {
        return this.metricsService.metrics$.asObservable().pipe(
            map((data) => ({ data: JSON.stringify(data) })),
        );
    }

    @Post()
    async create(@Body() dto: CreateMetricDto) {
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