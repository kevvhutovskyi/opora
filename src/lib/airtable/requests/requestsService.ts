import { ClientRequest } from "./types";

export async function createRequest(request: ClientRequest) {
  try {
    const response = await fetch("/api/requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error("Failed to create request");
    }

    return response.json();
  } catch (e) {
    console.error(e);
    throw new Error("Failed to create request");
  }
}