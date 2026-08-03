import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface CreateMetricDto {
    url: string;
    statusCode: number;
    responseTime: number;
    error?: string;
}

@Injectable()
export class MetricsService {
    constructor(private prisma: PrismaService) {}

    async create(dto: CreateMetricDto) {
        return this.prisma.metric.create({
            data: dto,
        });
    }

    async findByUrl(url: string) {
        return this.prisma.metric.findMany({
            where: { url },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }

    async getUniqueUrls() {
        const urls = await this.prisma.metric.findMany({
            distinct: ['url'],
            select: { url: true },
        });
        return urls.map((u) => u.url);
    }
}