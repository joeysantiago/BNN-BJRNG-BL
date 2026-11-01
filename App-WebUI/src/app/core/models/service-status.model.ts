export type ServiceState = 'checking' | 'operational' | 'degraded' | 'outage' | 'unreachable';

/** official = the service's own status page. probe = a reachability check from this browser. */
export type ServiceSource = 'official' | 'probe';

export interface ServiceResult {
  state: ServiceState;
  source: ServiceSource;
}
