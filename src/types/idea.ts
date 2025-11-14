export type IdeaStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PROMOTED'
  | 'IMPLEMENTED';

export interface Idea {
  id: string;
  title: string;
  description: string;
  category: string;
  submittedBy: string;
  submittedAt: string; // ISO string
  status: IdeaStatus | string; // allow backend variations safely
  voteCount: number;
  upVotes: number;
  downVotes: number;
  viewCount: number;
  projectCode?: string | null;
}

export interface IdeaCounts {
  pending: number;
  approved: number;
  rejected: number;
  promoted: number;
}
