export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message: string | null;
}

export interface SpeedInfo {
  ip: string;
  serverName: string;
}
