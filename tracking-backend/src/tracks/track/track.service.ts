// src/tracks/track/track.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Track, TrackDocument } from '../track.schema';

@Injectable()
export class TrackService {
  constructor(
    @InjectModel(Track.name) private trackModel: Model<TrackDocument>,
  ) {}

  async create(trackData: Partial<Track>): Promise<Track> {
    const createdTrack = new this.trackModel(trackData);
    return createdTrack.save();
  }

  async findAll(): Promise<Track[]> {
    return this.trackModel.find().exec();
  }

  async findById(id: string): Promise<Track> {
    const track = await this.trackModel.findById(id).exec();
    if (!track) {
      throw new NotFoundException(`Track with ID ${id} not found`);
    }
    return track;
  }

  // Méthode pour mettre à jour le contenu GPX
  async updateGpxContent(id: string, gpxContent: string): Promise<Track> {
    const updatedTrack = await this.trackModel
      .findByIdAndUpdate(id, { gpxContent }, { new: true })
      .exec();
    if (!updatedTrack) {
      throw new NotFoundException(`Track with ID ${id} not found`);
    }
    return updatedTrack;
  }

  async delete(id: string): Promise<Track> {
    const deletedTrack = await this.trackModel.findByIdAndDelete(id).exec();
    if (!deletedTrack) {
      throw new NotFoundException(`Track with ID ${id} not found`);
    }
    return deletedTrack;
  }
}
