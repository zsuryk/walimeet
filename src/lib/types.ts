export interface Poll {
  id: string;
  name: string;
  description: string;
  dates: string[];
  timeRange: {
    start: string;
    end: string;
  };
  timezone: string;
  slotMinutes: 15;
  creatorName: string;
  createdAt: number;
  expiresAt: number;
  responses: Record<string, ParticipantResponse>;
}

export interface ParticipantResponse {
  name: string;
  availabilities: Record<string, boolean>;
  submittedAt: number;
}

export interface CreatePollInput {
  name: string;
  description: string;
  dates: string[];
  timeRange: {
    start: string;
    end: string;
  };
  timezone: string;
  creatorName: string;
  expiryDays: number;
}

export interface RespondInput {
  name: string;
  availabilities: Record<string, boolean>;
}
