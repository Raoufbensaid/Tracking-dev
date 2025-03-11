// src/tracks/track.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TrackDocument = Track & Document;

@Schema({ timestamps: true })
export class Track {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  startTime: Date;

  @Prop({ required: true })
  endTime: Date;

  @Prop({ required: true })
  distance: number;

  @Prop({
    type: [
      {
        latitude: Number,
        longitude: Number,
        altitude: Number,
        timestamp: Date,
      },
    ],
    default: [],
  })
  path: {
    latitude: number;
    longitude: number;
    altitude?: number;
    timestamp?: Date;
  }[];

  @Prop()
  gpxContent?: string; // Champ pour stocker le contenu GPX
}

export const TrackSchema = SchemaFactory.createForClass(Track);
