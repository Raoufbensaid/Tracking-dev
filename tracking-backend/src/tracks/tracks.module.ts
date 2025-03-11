// src/tracks/tracks.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Track, TrackSchema } from './track.schema';
import { TrackService } from './track/track.service';
import { TrackController } from './track/track.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Track.name, schema: TrackSchema }]),
  ],
  controllers: [TrackController],
  providers: [TrackService],
})
export class TrackModule {}
