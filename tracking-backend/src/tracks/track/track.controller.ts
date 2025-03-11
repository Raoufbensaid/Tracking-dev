// src/tracks/track/track.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { TrackService } from './track.service';
import { Track } from '../track.schema';

@Controller('tracks')
export class TrackController {
  constructor(private readonly trackService: TrackService) {}

  @Post()
  async create(@Body() createTrackDto: Partial<Track>): Promise<Track> {
    return this.trackService.create(createTrackDto);
  }

  @Get()
  async findAll(): Promise<Track[]> {
    return this.trackService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<Track> {
    return this.trackService.findById(id);
  }

  // Nouvel endpoint pour mettre à jour le contenu GPX du track
  @Put(':id/gpx')
  async updateGpx(
    @Param('id') id: string,
    @Body('gpxContent') gpxContent: string,
  ): Promise<Track> {
    return this.trackService.updateGpxContent(id, gpxContent);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<Track> {
    return this.trackService.delete(id);
  }
}
