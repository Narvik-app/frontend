import type {View} from "./view";

export interface FetchAllData<T> {
  items: T[];
  totalItems: number | undefined
  view: View | undefined;
  error: Error | undefined;
  hubUrl: URL | undefined;
}

export interface FetchItemData<T> {
  retrieved: T | undefined;
  error: Error | undefined;
  hubUrl: URL | undefined;
}

export interface CreateItemData<T> {
  created: T | undefined;
  error: Error | undefined;
}

export interface UpdateItemData<T> {
  updated: T | undefined;
  error: Error | undefined;
}
