
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN', // Platform Owner
  LEAD = 'LEAD', // Platform Manager/Reviewer
  FOUNDER = 'FOUNDER',
  DEVELOPER = 'DEVELOPER',
  NONE = 'NONE'
}

export enum ViewType {
  SQUADRAN_HOME = 'SQUADRAN_HOME',
  SUPER_ADMIN_DASHBOARD = 'SUPER_ADMIN_DASHBOARD',
  SPRINT_HUB = 'SPRINT_HUB', // Project Dashboard
  DEV_MARKET = 'DEV_MARKET', // Developers Apply
  LAUNCHPAD = 'LAUNCHPAD', // Project Delivery
  UPDATES = 'UPDATES', // New Updates Section
  NETWORKING = 'NETWORKING',
  MESSAGES = 'MESSAGES',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  USER_DASHBOARD = 'USER_DASHBOARD',
  PROFILE = 'PROFILE'
}

export enum FeatureType {
  CONTENT_ASSISTANT = 'CONTENT_ASSISTANT',
}

export interface Feature {
  id: FeatureType;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  suggestedPrompts?: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  email?: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  blocked?: boolean;

  // Founder Specific Fields
  startupName?: string;
  startupStage?: string;
  startupDescription?: string;
  techHelpNeeded?: string;
  budget?: string;
  timeline?: string;

  // Developer Specific Fields
  college?: string;
  skills?: string;
  githubUrl?: string;
  timeAvailability?: string;
  experience?: string;
  status?: 'ONLINE' | 'OFFLINE';
  lastSeen?: number;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
  read: boolean;
}

export interface MVPData {
  description: string;
  techStack: string[];
  docLink: string;
  status: 'READY' | 'IN_PROGRESS';
  schemaImage?: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  title?: string;
  image?: string;
  likes: number;
  likedBy?: string[]; // Array of User UIDs who liked this post
  comments: Comment[];
  status: 'PENDING' | 'VERIFIED' | 'REJECTED'; // PENDING = Review, VERIFIED = MVP Ready, REJECTED = Idea rejected by admin
  type: 'SPRINT_UPDATE' | 'OPEN_ROLE' | 'DELIVERY' | 'IDEA_SUBMISSION';
  timestamp: number;
  company?: string;
  jobLink?: string;

  // MVP Additions
  mvp?: MVPData;
  applicants?: string[]; // Array of User UIDs
  team?: string[]; // Array of User UIDs
  techStack?: string[]; // Founder-specified tech stack for MVP
  schemaImage?: string; // Founder-specified schema/architecture diagram
  githubUrl?: string; // Developer-submitted GitHub URL
  liveDemoUrl?: string; // Developer-submitted Live Demo URL

  // Targeted Updates
  projectId?: string; // Linked Project ID
  projectTitle?: string; // Linked Project Title
  projectTeam?: string[]; // Team members of the linked project
  projectAuthorId?: string; // Founder of the linked project
}
