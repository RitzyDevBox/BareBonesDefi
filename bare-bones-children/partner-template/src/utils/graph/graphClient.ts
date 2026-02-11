// graphClient.ts
export async function graphQuery<T>(
  url: string,
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();

  if (json.errors) {
    throw new Error(json.errors[0]?.message ?? "GraphQL Error");
  }

  return json.data as T;
}
