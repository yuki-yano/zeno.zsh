export type Input = Readonly<{
  [key: string]: unknown;
  lbuffer?: string;
  rbuffer?: string;
  snippet?: string;
  dir?: string;
}>;
