export interface Professional {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  bio: string;
  profilePicture?: string;
  rating: number;
  reviewCount: number;
  experience: string;
  specialties: string[];
  hourlyRate: number;
  avgResponseTime: string;
  isOnline: boolean;
  categories: string[];
  languages: string[];
  education: Education[];
  certifications: Certification[];
  availability: Availability;
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  year: number;
}

export interface Certification {
  name: string;
  issuer: string;
  year: number;
  expiry?: string;
}

export interface Availability {
  timezone: string;
  workingHours: {
    start: string;
    end: string;
  };
  unavailableUntil?: string;
}

export interface ProfessionalLock {
  professionalId: string;
  userId: string;
  categoryId: string;
  lockedAt: string;
  expiresAt: string;
  lockId: string;
}