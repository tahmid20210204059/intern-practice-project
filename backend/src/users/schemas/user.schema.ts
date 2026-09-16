import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
class Experience {
  @Prop({ required: true }) title: string;
  @Prop({ required: true }) company: string;
  @Prop() from: string;
  @Prop() to: string;
  @Prop() description: string;
}
const ExperienceSchema = SchemaFactory.createForClass(Experience);

@Schema({ _id: false })
class Education {
  @Prop({ required: true }) degree: string;
  @Prop({ required: true }) institute: string;
  @Prop() subject: string;
  @Prop() from: string;
  @Prop() to: string;
}
const EducationSchema = SchemaFactory.createForClass(Education);

@Schema({ _id: false })
class Links {
  @Prop({ default: '' }) portfolio: string;
  @Prop({ default: '' }) github: string;
  @Prop({ default: '' }) linkedin: string;
  @Prop({ default: '' }) facebook: string;
}
const LinksSchema = SchemaFactory.createForClass(Links);

@Schema({ _id: false })
class ProjectUrls {
  @Prop({ default: '' }) live: string;
  @Prop({ default: '' }) github: string;
}
const ProjectUrlsSchema = SchemaFactory.createForClass(ProjectUrls);

@Schema({ _id: false })
class PortfolioProject {
  @Prop({ required: true }) title: string;
  @Prop({ default: '' }) description: string;
  @Prop({ type: ProjectUrlsSchema, default: () => ({}) }) urls: ProjectUrls;
  @Prop({ type: [String], default: [] }) technologies: string[];
  @Prop({ required: true }) from: string;
  @Prop({ default: '' }) to: string;
  @Prop({ default: false }) isCurrent: boolean;
}
const PortfolioProjectSchema = SchemaFactory.createForClass(PortfolioProject);

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true }) name: string;
  @Prop({ required: true, unique: true }) email: string;
  @Prop({ required: true }) passwordHash: string;
  @Prop({ default: 'user', enum: ['user', 'admin'] }) role: string;
  @Prop({ default: '' }) headline: string;
  @Prop({ default: '' }) bio: string;
  @Prop({ default: '' }) avatarUrl: string;
  @Prop({ type: [String], default: [] }) skills: string[];
  @Prop({ type: [ExperienceSchema], default: [] }) experiences: Experience[];
  @Prop({ type: [EducationSchema], default: [] }) education: Education[];
  @Prop({ type: [PortfolioProjectSchema], default: [] }) portfolioProjects: PortfolioProject[];
  @Prop({ type: LinksSchema, default: () => ({}) }) links: Links;
  @Prop({ type: String, default: null, index: true }) refreshTokenHash: string | null;
  @Prop({ type: Date, default: null }) refreshTokenExpiresAt: Date | null;
}
export const UserSchema = SchemaFactory.createForClass(User);