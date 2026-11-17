export interface InputParameter {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  default?: any;
  description?: string;
  allowed_values?: string[];
  regex?: string;
}

export interface AutomationItem {
  id: string;
  name: string;
  category: string;
  os: 'Linux' | 'Windows';
  action: 'START' | 'STOP';
  description: string;
  workflow_file: string;
  git_ref: string;
  enabled: boolean;
  requires_configuration?: boolean;
  required_inputs?: InputParameter[];
  optional_inputs?: InputParameter[];
  github_input_mapping?: Record<string, string>;
  // For backwards compatibility
  inputs?: {
    required: InputParameter[];
    optional: InputParameter[];
  };
}

export interface AutomationRequest {
  id: string;
  automation_id: string;
  automation_name: string;
  category: string;
  os: string;
  action: string;
  sid: string;
  parameters: Record<string, any>;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  requested_by: string;
  requested_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_comment?: string;
  execution_id?: string;
}

export interface Execution {
  id: string;
  request_id: string;
  automation_id: string;
  workflow_file?: string;
  github_workflow?: string;
  automation_name?: string;
  sid?: string;
  action?: string;
  git_ref?: string;
  github_run_id?: string;
  github_run_url?: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  dispatched_at?: string;
  triggered_at?: string;
  completed_at?: string;
  log_summary?: string;
  execution_logs?: string;
  requested_by?: string;
  reviewed_by?: string;
  triggered_by?: string;
  error_message?: string;
}

export interface DashboardSummary {
  total_requests: number;
  pending_approvals: number;
  running_executions: number;
  successful_executions: number;
  failed_executions: number;
}

export interface User {
  username: string;
  name: string;
  role: 'engineer' | 'approver' | 'admin' | 'requester';
}
