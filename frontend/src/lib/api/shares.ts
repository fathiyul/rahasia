import { apiFetch } from "./client";
import type { CreateSharePayload, CreateShareResponse } from "../../types/share";

export function createShare(payload: CreateSharePayload): Promise<CreateShareResponse> {
    return apiFetch<CreateShareResponse>('/shares', {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}