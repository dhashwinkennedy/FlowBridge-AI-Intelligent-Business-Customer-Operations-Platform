/**
 * AxiomX Centralized API Service Client
 * Uses environment variable VITE_API_BASE_URL (defaults to http://localhost:8000/api/v1)
 */

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/+$/, '');

// Types
export interface User {
  user_id: string;
  company_id: string;
  name: string;
  email: string;
  role: 'platform_admin' | 'company_admin' | 'manager' | 'employee' | 'support_agent';
  department?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Company {
  company_id: string;
  company_name: string;
  company_slug: string;
  industry?: string;
  configured_departments?: string[];
  approval_rules?: any[];
  created_at?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  company_id?: string;
}

export interface DocumentItem {
  document_id: string;
  company_id: string;
  filename: string;
  file_type: string;
  knowledge_type: 'customer' | 'internal';
  pinecone_namespace: string;
  total_chunks: number;
  indexing_status: 'processing' | 'completed' | 'failed';
  indexing_error?: string;
  uploaded_by?: string;
  uploaded_at: string;
  updated_at?: string;
}

export interface Ticket {
  ticket_id: string;
  company_id: string;
  customer_name: string;
  customer_email: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: 'open' | 'assigned' | 'in_progress' | 'waiting_for_customer' | 'resolved' | 'closed';
  resolution_notes?: string;
  conversation_id?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRequest {
  request_id: string;
  company_id: string;
  created_by: string;
  request_text: string;
  request_category: string;
  extracted_information: {
    category: string;
    priority: string;
    missing_information: string[];
  };
  priority: string;
  status: 'awaiting_review' | 'pending_approval' | 'in_progress' | 'approved' | 'rejected' | 'completed';
  generated_workflow: {
    steps: string[];
  };
  requires_approval: boolean;
  related_ticket_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  activity_id: string;
  company_id: string;
  title: string;
  description: string;
  assigned_to?: string | null;
  assigned_department?: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: string | null;
  request_id?: string | null;
  status: 'open' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  last_updated_at?: string;
}

export interface Approval {
  approval_id: string;
  company_id: string;
  request_id: string;
  requested_by: string;
  approver_id?: string | null;
  approval_type: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  remarks?: string | null;
  decision_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardOverview {
  tickets_open: number;
  activities_open: number;
  approvals_pending: number;
}

// Token storage helpers
export const tokenStorage = {
  getAccessToken: () => localStorage.getItem('axiomx_access_token'),
  getRefreshToken: () => localStorage.getItem('axiomx_refresh_token'),
  setTokens: (access: string, refresh?: string) => {
    localStorage.setItem('axiomx_access_token', access);
    if (refresh) localStorage.setItem('axiomx_refresh_token', refresh);
  },
  clearTokens: () => {
    localStorage.removeItem('axiomx_access_token');
    localStorage.removeItem('axiomx_refresh_token');
    localStorage.removeItem('axiomx_user');
  },
};

// Generic fetch wrapper
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = tokenStorage.getAccessToken();

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Handle json payload
  if (options.body && !(options.body instanceof FormData) && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err: any) {
    throw new Error(`Network error connecting to backend API (${API_BASE_URL}): ${err.message || err}`);
  }

  // Handle 401 Unauthorized token refresh attempt
  if (response.status === 401 && tokenStorage.getRefreshToken() && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh?token=${encodeURIComponent(tokenStorage.getRefreshToken()!)}`, {
        method: 'POST',
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        tokenStorage.setTokens(refreshData.access_token);
        headers['Authorization'] = `Bearer ${refreshData.access_token}`;
        response = await fetch(url, { ...options, headers });
      } else {
        tokenStorage.clearTokens();
      }
    } catch {
      tokenStorage.clearTokens();
    }
  }

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      // not JSON
    }
    throw new Error(errorDetail || `API request failed with HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Exported API Methods
export const api = {
  // Auth
  registerCompany: (data: { company_name: string; company_slug: string; admin_name: string; admin_email: string; password: string; industry?: string }) =>
    apiRequest<AuthTokens>('/auth/register-company', { method: 'POST', body: data as any }),

  login: (data: { email: string; password: string }) =>
    apiRequest<AuthTokens>('/auth/login', { method: 'POST', body: data as any }),

  getMe: () => apiRequest<User>('/auth/me'),

  getUsers: () => apiRequest<User[]>('/auth/users'),

  inviteEmployee: (data: { name: string; email: string; password: string; role: string; department?: string }) =>
    apiRequest<User>('/auth/invite-employee', { method: 'POST', body: data as any }),

  getCompanyMe: () => apiRequest<Company>('/companies/me'),

  // Public Customer Assistant Endpoints
  getPublicCompany: (slug: string) =>
    apiRequest<{ company_name: string; company_slug: string; industry?: string }>(`/public/companies/${encodeURIComponent(slug)}`),

  publicChat: (slug: string, data: { message: string; conversation_id?: string; customer_name?: string; customer_email?: string }) =>
    apiRequest<{ conversation_id: string; answer: string; sources: any[] }>(`/public/companies/${encodeURIComponent(slug)}/chat`, { method: 'POST', body: data as any }),

  getPublicConversation: (slug: string, conversation_id: string, customer_email: string) =>
    apiRequest<any>(`/public/companies/${encodeURIComponent(slug)}/conversations/${encodeURIComponent(conversation_id)}?customer_email=${encodeURIComponent(customer_email)}`),

  createPublicTicket: (slug: string, data: { customer_name: string; customer_email: string; subject: string; description: string; category?: string; conversation_id?: string }) =>
    apiRequest<Ticket>(`/public/companies/${encodeURIComponent(slug)}/tickets`, { method: 'POST', body: data as any }),

  getPublicTicketStatus: (slug: string, ticket_id: string, customer_email: string) =>
    apiRequest<Partial<Ticket>>(`/public/companies/${encodeURIComponent(slug)}/tickets/${encodeURIComponent(ticket_id)}?customer_email=${encodeURIComponent(customer_email)}`),

  // Knowledge Documents (Pinecone RAG)
  listDocuments: () => apiRequest<DocumentItem[]>('/knowledge/documents'),

  uploadDocument: (file: File, knowledge_type: 'customer' | 'internal') => {
    const formData = new FormData();
    formData.append('file', file);
    return apiRequest<DocumentItem>(`/knowledge/documents/upload?knowledge_type=${encodeURIComponent(knowledge_type)}`, {
      method: 'POST',
      body: formData,
    });
  },

  deleteDocument: (document_id: string) =>
    apiRequest<void>(`/knowledge/documents/${encodeURIComponent(document_id)}`, { method: 'DELETE' }),

  reindexDocument: (document_id: string) =>
    apiRequest<{ document_id: string; status: string; message: string }>(`/knowledge/documents/${encodeURIComponent(document_id)}/reindex`, { method: 'POST' }),

  // Support Tickets
  listTickets: () => apiRequest<Ticket[]>('/tickets'),
  getTicket: (ticket_id: string) => apiRequest<Ticket>(`/tickets/${encodeURIComponent(ticket_id)}`),
  updateTicketStatus: (ticket_id: string, status: string, resolution_notes?: string) =>
    apiRequest<Ticket>(`/tickets/${encodeURIComponent(ticket_id)}/status`, { method: 'PATCH', body: { status, resolution_notes } as any }),

  // AI Business Copilot
  understandRequest: (request_text: string, conversation_id?: string, ticket_id?: string) =>
    apiRequest<{ category: string; priority: string; missing_information: string[] }>('/copilot/understand-request', {
      method: 'POST',
      body: { request_text, conversation_id, ticket_id } as any,
    }),

  generateWorkflow: (request_text: string, conversation_id?: string, ticket_id?: string) =>
    apiRequest<WorkflowRequest | { status: 'clarification_required'; category: string; priority: string; missing_information: string[] }>('/copilot/generate-workflow', {
      method: 'POST',
      body: { request_text, conversation_id, ticket_id } as any,
    }),

  confirmWorkflow: (request_id: string) =>
    apiRequest<{ request_id: string; status: string }>('/copilot/confirm-workflow', {
      method: 'POST',
      body: { request_id } as any,
    }),

  listWorkflowRequests: () => apiRequest<WorkflowRequest[]>('/copilot/requests'),
  getWorkflowRequest: (request_id: string) => apiRequest<WorkflowRequest>(`/copilot/requests/${encodeURIComponent(request_id)}`),

  // Activities
  listActivities: () => apiRequest<Activity[]>('/activities'),
  createActivity: (data: { title: string; description?: string; assigned_to?: string; assigned_department?: string; priority?: string; deadline?: string; request_id?: string }) =>
    apiRequest<Activity>('/activities', { method: 'POST', body: data as any }),
  updateActivityStatus: (activity_id: string, status: string) =>
    apiRequest<{ status: string }>(`/activities/${encodeURIComponent(activity_id)}/status`, { method: 'PATCH', body: { status } as any }),

  // Approvals
  listApprovals: () => apiRequest<Approval[]>('/approvals'),
  approve: (approval_id: string, remarks?: string) =>
    apiRequest<Approval>(`/approvals/${encodeURIComponent(approval_id)}/approve`, { method: 'POST', body: { remarks } as any }),
  reject: (approval_id: string, remarks?: string) =>
    apiRequest<Approval>(`/approvals/${encodeURIComponent(approval_id)}/reject`, { method: 'POST', body: { remarks } as any }),

  // Notifications & Dashboard Overview
  getOverview: () => apiRequest<DashboardOverview>('/dashboard/overview'),
  getNotifications: () => apiRequest<any[]>('/notifications'),
};
