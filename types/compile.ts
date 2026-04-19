
export interface CompileRequest {
    script: string;
    stdin: string;
    languageId: number;
    token: string;
    secureToken: string;
}

export interface CompileResponse {
    output: string;
    status: string;
    time: string | null;
    memory: number | null;
}
