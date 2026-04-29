/** Parse response as JSON; throw helpful error if server returns HTML (e.g. backend off). */
export async function parseJsonResponse<T = unknown>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();
  if (!contentType.includes("application/json") || text.trim().startsWith("<")) {
    const msg = text.startsWith("<")
      ? "Backend oprit sau API indisponibil. Pornește serverul cu `npm run server`."
      : text.slice(0, 200);
    throw new Error(msg);
  }
  return JSON.parse(text) as T;
}
