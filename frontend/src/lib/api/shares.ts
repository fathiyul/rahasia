import { apiFetch } from "./client";
import type { CreateSharePayload, CreateShareResponse, GetShareResponse } from "../../types/share";

export function createShare(payload: CreateSharePayload): Promise<CreateShareResponse> {
    return apiFetch<CreateShareResponse>('/shares', {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

export function getShare(id: string): Promise<GetShareResponse> {
    return apiFetch<GetShareResponse>(`/shares/${id}`);
}