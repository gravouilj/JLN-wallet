// Types pour le système de support/tickets

export interface TicketData {
  id: string;
  created_at: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  subject: string;
  message: string;
  category: 'verification' | 'technical' | 'general' | 'report';
  priority: 'low' | 'medium' | 'high';
  creator_address?: string;
  token_id?: string;
  profile_id?: string;
  admin_response?: string;
  resolved_at?: string;
}

export interface TicketFormData {
  subject: string;
  message: string;
  category: TicketData['category'];
  priority: TicketData['priority'];
  tokenId?: string;
  profileId?: string;
}

export interface ConversationMessage {
  id: string;
  created_at: string;
  sender: 'client' | 'admin';
  message: string;
  attachments?: string[];
}

export interface TicketWithConversation extends TicketData {
  conversation: ConversationMessage[];
}
