import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TargetsService {
    constructor(private prisma: PrismaService) {}

    async findAll() {
        return this.prisma.target.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    async create(url: string) {
        let formattedUrl = url.trim();
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
            formattedUrl = `https://${formattedUrl}`;
        }

        return this.prisma.target.upsert({
            where: { url: formattedUrl },
            update: {},
            create: { url: formattedUrl },
        });
    }

    async remove(id: string) {
        return this.prisma.target.delete({
            where: { id },
        });
    }
}