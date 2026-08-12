const DELAY_MS = 400;

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface ApiError {
  error: string;
  status: number;
}

export function mockClient<T>(data: T, delay = DELAY_MS): Promise<ApiResponse<T>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ data, status: 200 });
    }, delay);
  });
}

export function mockClientError(message: string, status = 400): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject({ error: message, status } as ApiError);
    }, DELAY_MS);
  });
}
