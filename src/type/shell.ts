export type Input = Readonly<{
  [key: string]: unknown;
  lbuffer?: string;
  rbuffer?: string;
  snippet?: string;
  template?: string;
  dir?: string;
  completionCallback?: Readonly<{
    sourceId?: string;
    selectedFile?: string;
    expectKey?: string;
  }>;
  completionPreview?: Readonly<{
    sourceId?: string;
    item?: string;
  }>;
}>;
