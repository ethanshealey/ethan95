
export interface CompileRequest {
    script: string,
    stdin: string,
    language: string,
    versionIndex: string
}

export interface CompileResponse {
    output: string,
    error: string,
    statusCode: number,
    memory: string,
    cpuTime: string,
    isExecutionSuccess: boolean,
    isCompiled: boolean
}