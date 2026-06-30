export interface FragmentMetadata {
  id: string;
  title: string;
  chronological_order: number;
  tags: string[];
  warnings: string[];
  stage?: string;
  reviewed?: boolean;
}

