import type { ColorKey } from "./colors";

export interface Card {
  id: number;
  list_id: number;
  title: string;
  description: string;
  position: number;
  color: ColorKey | null;
  created_at: string;
  updated_at: string;
}

export interface List {
  id: number;
  title: string;
  position: number;
  color: ColorKey | null;
  created_at: string;
  cards: Card[];
}

export type BoardData = List[];
