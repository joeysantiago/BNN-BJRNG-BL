/** One option of a choice group: the value it stands for, its text and, optionally, a line icon as the `d` of its SVG paths (24 x 24, fixed in the code). */
export interface ChoiceOption {
  icon?: string[];
  label: string;
  value: string;
}
