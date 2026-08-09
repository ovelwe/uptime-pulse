import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { PrismaService } from '../prisma.service';

@Module({
    imports: [
        ClientsModule.register([
            {
                name: 'METRICS_SERVICE',
                transport: Transport.RMQ,
                options: {
                    urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
                    queue: 'metrics_queue',
                    queueOptions: {
                        durable: true,
                    },
                },
            },
        ]),
    ],
    controllers: [MetricsController],
    providers: [MetricsService, PrismaService],
    exports: [MetricsService, ClientsModule],
})
export class MetricsModule {}