export interface AutomationInputDef {
  name: string;
  label: string;
  type: string;
  placeholder?: string;
  regex?: string;
  description?: string;
}

export interface AutomationItem {
  id: string;
  name: string;
  category: string;
  os: string;
  action: 'START' | 'STOP';
  description: string;
  workflow_file: string;
  git_ref: string;
  enabled: boolean;
  requires_configuration?: boolean;
  required_inputs: AutomationInputDef[];
  optional_inputs: AutomationInputDef[];
}

export interface AutomationRequest {
  id: string;
  automation_id: string;
  automation_name: string;
  category: string;
  os: string;
  action: 'START' | 'STOP';
  sid: string;
  parameters: Record<string, any>;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'RUNNING' | 'COMPLETED' | 'REJECTED' | 'FAILED' | 'QUEUED';
  requested_by: string;
  requested_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_comment?: string;
  execution_id?: string;
}

export interface ExecutionRecord {
  id: string;
  request_id: string;
  automation_id: string;
  workflow_file: string;
  git_ref: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  github_run_id?: string;
  github_run_url?: string;
  dispatched_at: string;
  completed_at?: string;
  log_summary?: string;
  automation_name?: string;
  sid?: string;
  requested_by?: string;
  reviewed_by?: string;
}

export interface DashboardSummaryData {
  total_requests: number;
  pending_approvals: number;
  running_executions: number;
  successful_executions: number;
  failed_executions: number;
}
