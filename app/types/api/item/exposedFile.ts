import type {Item} from "../item";

export interface ExposedFile extends Item {
  id: string;
  name: string;
  base64: string;
  mimeType: string;
}
