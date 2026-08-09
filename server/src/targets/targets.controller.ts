import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { TargetsService } from './targets.service';

@Controller('targets')
export class TargetsController {
    constructor(private readonly targetsService: TargetsService) {}

    @Get()
    async findAll() {
        return this.targetsService.findAll();
    }

    @Post()
    async create(@Body('url') url: string) {
        return this.targetsService.create(url);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.targetsService.remove(id);
    }
}