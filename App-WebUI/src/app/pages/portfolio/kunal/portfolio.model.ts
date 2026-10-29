export type ProjectFilter = 'all' | 'enterprise' | 'azure' | 'data';

export interface Project {
  id: string;
  kind: string;
  name: string;
  text: string;
  big?: boolean;
  when?: string;
  label?: string;
  short?: string;
  star?: boolean;
  tags: string[];
  stack: string[];
  v: number | null;
}

export interface FilterOption {
  id: ProjectFilter;
  label: string;
}

export interface Stat {
  end: number;
  label: string;
  suffix: string;
}

export interface Dot {
  c: string;
  r: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Spark {
  c: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}
