export async function customFetcher<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const baseUrl = "http://localhost:3001/api";

  const response = await fetch(baseUrl + url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}