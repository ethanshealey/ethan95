import { Dispatch, SetStateAction } from "react";
import { EmulatedFileSystem, EmulatedFileSystemObject, OPEN_VIM_FLAG } from "../hooks/useEmulatedFileSystem";
import { extensionToLanguage, JDoodleLanguage, listSupportedLanguages } from "./LanguageHelper";
import { CompileRequest, CompileResponse } from "@/types/compile";

export function autofill(currentInput: string, fileSystem: EmulatedFileSystem | null, location: string[]): string[] {

    const parts = currentInput.split(' ').filter(part => part.length > 0)
    console.log(parts)

    if (parts.length < 1 || !fileSystem) return [];

    let dir = null

    const response: string[] = []

    switch (parts[0].toUpperCase()) {
        // Directories
        case 'CD':
        case 'CHDIR':
        case 'LS':
        case 'DIR': {
            const segments = parts.length > 1
                ? parts[1].replaceAll('/', '\\').split('\\')
                : [];
            const prefix = segments[segments.length - 1] ?? '';
            const dirLocation = resolvePath(segments.slice(0, -1), location);
            const pathPrefix = segments.slice(0, -1).join('\\');

            dir = getDirectoriesFromDirectory(fileSystem, dirLocation);
            if (!dir) return [];

            for (const item of dir) {
                if (item.name.toUpperCase().startsWith(prefix.toUpperCase()))
                    response.push(pathPrefix ? `${pathPrefix}\\${item.name}` : item.name);
            }

            return response;
        }

        // Files only
        case 'CAT':
        case 'VI':
        case 'VIM':
        case 'EDIT':
        case 'EXEC': {
            const segments = parts.length > 1
                ? parts[1].replaceAll('/', '\\').split('\\')
                : [];
            const prefix = segments[segments.length - 1] ?? '';
            const dirLocation = resolvePath(segments.slice(0, -1), location);
            const pathPrefix = segments.slice(0, -1).join('\\');

            dir = getObjectsFromDirectory(fileSystem, dirLocation);
            if (!dir) return [];

            for (const item of dir) {
                if (item.name.toUpperCase().startsWith(prefix.toUpperCase()))
                    response.push(pathPrefix ? `${pathPrefix}\\${item.name}` : item.name);
            }

            return response;
        }

        // Files and directories
        case 'DEL':
        case 'RM': {
            // skip -r flag token if present
            const argIdx = (parts[1] === '-r' || parts[1] === '/s') ? 2 : 1;
            const segments = parts.length > argIdx
                ? parts[argIdx].replaceAll('/', '\\').split('\\')
                : [];
            const prefix = segments[segments.length - 1] ?? '';
            const dirLocation = resolvePath(segments.slice(0, -1), location);
            const pathPrefix = segments.slice(0, -1).join('\\');

            dir = getObjectsFromDirectory(fileSystem, dirLocation);
            if (!dir) return [];

            for (const item of dir) {
                if (item.name.toUpperCase().startsWith(prefix.toUpperCase()))
                    response.push(pathPrefix ? `${pathPrefix}\\${item.name}` : item.name);
            }

            return response;
        }

    }

    return response
}

/** Resolves path segments against a base location, handling ~, ., and .. */
export function resolvePath(pathParts: string[], location: string[]): string[] {
    const resolved = [...location];
    for (const part of pathParts) {
        if (part === '~') {
            resolved.length = 0;
            resolved.push('home', 'user', 'ethan95');
        } else if (part === '..') {
            if (resolved.length > 0) resolved.pop();
        } else if (part !== '.') {
            resolved.push(part);
        }
    }
    return resolved;
}

function getCurrentDateForFileSystem(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const hours = String(now.getHours() % 12 || 12).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'p' : 'a';
    return `${month}-${day}-${year}  ${hours}:${minutes}${ampm}`;
}

export function getObjectsFromDirectory(fileSystem: EmulatedFileSystem, location: string[]): EmulatedFileSystemObject[] | null {

    console.log('Getting objects from ', location)

    let currentDir = fileSystem

    for (const dir of location) {

        const nextDir = currentDir.contents.find(obj => obj.name.toLocaleUpperCase() === dir.toLocaleUpperCase() && obj.type === 'directory');
        if (!nextDir || !nextDir.children) {
            return null;
        }
        currentDir = { contents: nextDir.children }
    }

    return [...currentDir.contents];
}

export function getObjectFromDirectory(fileSystem: EmulatedFileSystem, location: string[], name: string): EmulatedFileSystemObject | null {
    const objects = getObjectsFromDirectory(fileSystem, location);
    if (!objects) {
        return null
    }
    const target = objects.find(obj => obj.name.toLocaleUpperCase() === name.toLocaleUpperCase());
    return target || null;
}

export function getDirectoriesFromDirectory(fileSystem: EmulatedFileSystem, location: string[]): EmulatedFileSystemObject[] | null {
    const objects = getObjectsFromDirectory(fileSystem, location);
    if (!objects) {
        return null
    }
    return objects.filter(obj => obj.type === 'directory')
}

/**
 * Changes Directory in an EmulatedFileSystem object. Usage: (cd|chdir) [directory]
 * @param tokens the command tokens, where tokens[0] is 'cd' or 'chdir' and tokens[1] is the target directory
 * @param fileSystem the emulated file system
 * @param location  the current location of the user
 * @param setLocation location setter method
 * @returns 
 */
export function changeDirectory(
    tokens: string[],
    fileSystem: EmulatedFileSystem | null,
    location: string[],
    setLocation: Dispatch<SetStateAction<string[]>>): string[] | null {

    if (tokens.length === 1) {
        // Go to root of filesystem
        setLocation([])
        return []
    }
    else if (tokens.length > 2) {
        return ["Too many arguments. Usage: cd [directory]"]
    }

    const targets = tokens[1].replaceAll('/', '\\').split('\\').filter(part => part.length > 0);
    const newLocation: string[] = [...location];

    for (const target of targets) {
        if (target === ".") {
        }
        else if (target === "..") {
            if (newLocation.length === 0) {
                return []
            }
            newLocation.pop()
        }
        else if (target === "~") {
            newLocation.length = 0
            newLocation.push('home', 'user', 'ethan95')
        }
        else {
            if (!fileSystem) {
                return ["An error occurred: filesystem not found"]
            }

            // Get all possible directories from current location
            const possibleDirs = getDirectoriesFromDirectory(fileSystem, newLocation)
            const targetDir = possibleDirs?.find(dir => dir.name.toLocaleUpperCase() === target.toLocaleUpperCase());
            if (!targetDir) {
                return [`Directory not found: ${target}`]
            }
            else {
                newLocation.push(targetDir.name);
            }
        }

        console.log('newLocation:', newLocation)
    }

    setLocation(_ => newLocation)
    return [];

}

/**
 * Lists the contents of a directory in an EmulatedFileSystem object. Usage: (ls|dir) [directory]
 * @param tokens the command tokens, where tokens[0] is 'ls' or 'dir' and tokens[1] is the target directory
 * @param fileSystem the emulated file system
 * @param location the current location of the user
 * @returns 
 */
export function listDirectory(tokens: string[], fileSystem: EmulatedFileSystem | null, location: string[]): string[] {

    if (!fileSystem) {
        return ["An error occurred: filesystem not found"]
    }

    let locationToList = [...location];
    if (tokens.length > 1) {
        // Looking for another directory. Need to compute location!
        const target = tokens[1].replaceAll('/', '\\').split('\\').filter(part => part.length > 0);
        locationToList.push(...target)

        for (let i = 0; i < locationToList.length; i++) {
            if (locationToList[i] === '.') {
                locationToList = locationToList.filter((_, idx) => idx !== i);
            }
            else if (locationToList[i] === '..') {
                locationToList = locationToList.filter((_, idx) => idx !== i && idx !== i - 1);
            }
        }
    }

    const objects = getObjectsFromDirectory(fileSystem, locationToList)

    const listedObjects: EmulatedFileSystemObject[] = []

    listedObjects.push({ name: '.', type: 'directory', create_ts: '04-05-26  12:00a' })
    listedObjects.push({ name: '..', type: 'directory', create_ts: '04-05-26  12:00a' })
    if (objects)
        listedObjects.push(...objects)

    // Format into string array for output
    const output: string[] = [
        '',
        ` Volume in drive C is ETHAN95`,
        ` Volume Serial Number is 46FI-81DC`,
        '',
        ` Directory of C:\\${locationToList.join('\\')}`,
        '',
    ]

    for (const obj of listedObjects) {
        const name = obj.name.padEnd(15);
        const typeCol = obj.type === 'directory'
            ? '<DIR>'.padEnd(15)
            : String(obj.size ?? '').padStart(10).padEnd(15);
        output.push(`${name}${typeCol}${obj.create_ts}`)
    }

    return output;

}

/**
 * Creates a new directory in an EmulatedFileSystem object. Usage: mkdir [directory_name]
 * @param tokens the command tokens, where tokens[0] is 'mkdir' and tokens[1] is the target directory
 * @param fileSystem the emulated file system
 * @param location the current location of the user
 * @param setFileSystem sets the file system state with the new directory added
 * @param isDir whether the new object should be a file or directory
 * @returns 
 */
export function createObject(tokens: string[], fileSystem: EmulatedFileSystem | null, location: string[], setFileSystem: Dispatch<SetStateAction<EmulatedFileSystem | null>>, isDir: boolean, content?: string): string[] {
    if (tokens.length !== 2) {
        return ['Invalid usage.']
    }
    if (!fileSystem) {
        return ['An error occurred: filesystem not found']
    }

    const pathParts = tokens[1].replaceAll('/', '\\').split('\\').filter(p => p.length > 0);
    const name = pathParts[pathParts.length - 1];
    const dirParts = [...location, ...pathParts.slice(0, -1)];

    // Deep clone so React detects the change
    const newFileSystem: EmulatedFileSystem = JSON.parse(JSON.stringify(fileSystem));

    // Navigate to the target directory
    let currentDir = newFileSystem;
    for (const dir of dirParts) {
        const next = currentDir.contents.find(obj => obj.name.toLocaleUpperCase() === dir.toLocaleUpperCase() && obj.type === 'directory');
        if (!next?.children) return ['An error occurred: directory not found'];
        currentDir = { contents: next.children };
    }

    const existing = currentDir.contents.find(obj => obj.name.toLocaleUpperCase() === name.toLocaleUpperCase());
    if (existing) {
        return [`${isDir ? 'Directory' : 'File'} already exists: ${name}`];
    }

    currentDir.contents.push({
        name,
        type: isDir ? 'directory' : 'file',
        size: isDir ? undefined : (content?.length ?? 0),
        create_ts: getCurrentDateForFileSystem(),
        ...(isDir ? { children: [] } : { content: content ?? '' }),
    });

    setFileSystem(newFileSystem);
    return [];
}

/**
 * Creates a new file in an EmulatedFileSystem object. 
 * @param tokens the command tokens, where tokens[0] is 'touch' and tokens[1] is the target file
 * @param fileSystem the emulated file system
 * @param location the current location of the user
 * @param setFileSystem sets the file system state with the new directory added
 * @returns 
 */
export function createFile(tokens: string[], fileSystem: EmulatedFileSystem | null, location: string[], setFileSystem: Dispatch<SetStateAction<EmulatedFileSystem | null>>) {
    return createObject(tokens, fileSystem, location, setFileSystem, false)
}

/**
 * Creates a new directory in an EmulatedFileSystem object.
 * @param tokens the command tokens, where tokens[0] is 'mkdir' and tokens[1] is the target directory
 * @param fileSystem the emulated file system
 * @param location the current location of the user
 * @param setFileSystem sets the file system state with the new directory added
 * @returns 
 */
export function createDirectory(tokens: string[], fileSystem: EmulatedFileSystem | null, location: string[], setFileSystem: Dispatch<SetStateAction<EmulatedFileSystem | null>>): string[] {
    return createObject(tokens, fileSystem, location, setFileSystem, true)
}

/**
 * Creates a new file in an EmulatedFileSystem object. 
 * @param tokens the command tokens, where tokens[0] is 'touch' and tokens[1] is the target file
 * @param fileSystem the emulated file system
 * @param location the current location of the user
 * @param setFileSystem sets the file system state with the new directory added
 * @returns 
 */
export function updateFile(fileSystem: EmulatedFileSystem | null, path: string, location: string[], setFileSystem: Dispatch<SetStateAction<EmulatedFileSystem | null>>, content: string): string[] {

    if (!fileSystem) return ['An error occurred: filesystem not found'];

    const pathParts = path.replaceAll('/', '\\').split('\\').filter(p => p.length > 0);
    const fileName = pathParts[pathParts.length - 1];
    const dirParts = resolvePath(pathParts.slice(0, -1), location);

    // Deep clone so React detects the change
    const newFileSystem: EmulatedFileSystem = JSON.parse(JSON.stringify(fileSystem));

    // Navigate to the target directory
    let currentDir = newFileSystem;
    for (const dir of dirParts) {
        const next = currentDir.contents.find(obj => obj.name.toLocaleUpperCase() === dir.toLocaleUpperCase() && obj.type === 'directory');
        if (!next?.children) return ['An error occurred: directory not found'];
        currentDir = { contents: next.children };
    }

    // Find or create the file
    const existing = currentDir.contents.find(obj => obj.name.toLocaleUpperCase() === fileName.toLocaleUpperCase() && obj.type === 'file');
    if (existing) {
        existing.content = content;
        existing.size = content.length;
    } else {
        currentDir.contents.push({
            name: fileName,
            type: 'file',
            size: content.length,
            create_ts: getCurrentDateForFileSystem(),
            content,
        });
    }

    setFileSystem(newFileSystem);
    return [];
}

/**
 * Deletes a file or directory from the EmulatedFileSystem. Usage: (rm|del) [-r] [target]
 * @param tokens the command tokens, where tokens[0] is 'rm' or 'del', optionally tokens[1] is '-r', and the last token is the target
 * @param fileSystem the emulated file system
 * @param location the current location of the user
 * @param setFileSystem sets the file system state with the target removed
 */
export function deleteFile(tokens: string[], fileSystem: EmulatedFileSystem | null, location: string[], setFileSystem: Dispatch<SetStateAction<EmulatedFileSystem | null>>): string[] {
    if (!fileSystem) {
        return ['An error occurred: filesystem not found'];
    }

    const recursive = tokens[1] === '-r' || tokens[1] === '/s';
    const targetToken = recursive ? tokens[2] : tokens[1];

    if (!targetToken) {
        return ['Invalid usage. Usage: (rm|del) [-r] [target]'];
    }

    const pathParts = targetToken.replaceAll('/', '\\').split('\\').filter(p => p.length > 0);
    const name = pathParts[pathParts.length - 1];
    const dirParts = [...location, ...pathParts.slice(0, -1)];

    const newFileSystem: EmulatedFileSystem = JSON.parse(JSON.stringify(fileSystem));

    let currentDir = newFileSystem;
    for (const dir of dirParts) {
        const next = currentDir.contents.find(obj => obj.name.toLocaleUpperCase() === dir.toLocaleUpperCase() && obj.type === 'directory');
        if (!next?.children) return ['An error occurred: directory not found'];
        currentDir = { contents: next.children };
    }

    const idx = currentDir.contents.findIndex(obj => obj.name.toLocaleUpperCase() === name.toLocaleUpperCase());
    if (idx === -1) return [`Not found: ${name}`];

    const target = currentDir.contents[idx];

    if (target.type === 'directory') {
        if ((target.children?.length ?? 0) > 0 && !recursive) {
            return [`${name} is not empty. Use -r to delete recursively.`];
        }
    }

    currentDir.contents.splice(idx, 1);
    setFileSystem(newFileSystem);
    return [];
}

export function echo(tokens: string[]): string[] {
    if (tokens.length === 1) {
        return ['']
    }

    return [tokens.slice(1).join(' ')]
}

export function cat(tokens: string[], fileSystem: EmulatedFileSystem | null, location: string[]): string[] {

    if (tokens.length !== 2) {
        return ['Invalid usage. Usage: cat [file_name]']
    }

    const targets = tokens[1].replaceAll('/', '\\').split('\\').filter(part => part.length > 0);
    const fileName = targets[targets.length - 1];
    const dirLocation = resolvePath(targets.slice(0, -1), location);

    const obj: EmulatedFileSystemObject | null = getObjectFromDirectory(fileSystem!, dirLocation, fileName)

    console.log(obj)

    if (obj === null) {
        return [`File not found: ${tokens[1]}`]
    }
    else if (obj.type === 'directory') {
        return [`${tokens[1]} is a directory`]
    }
    else {
        return obj.content ? obj.content.split('\n') : ['']
    }
}

export function editFile(tokens: string[], fileSystem: EmulatedFileSystem | null, location: string[], setFileSystem: Dispatch<SetStateAction<EmulatedFileSystem | null>>): string[] {

    if (tokens.length !== 2) {
        return ['Invalid usage. Usage: (vi|vim|edit) [file_name]']
    }

    const targets = tokens[1].replaceAll('/', '\\').split('\\').filter(part => part.length > 0);
    const fileName = targets[targets.length - 1];
    const dirLocation = resolvePath(targets.slice(0, -1), location);

    let obj: EmulatedFileSystemObject | null = getObjectFromDirectory(fileSystem!, dirLocation, fileName)

    if(obj === null) {
        obj = {
            name: tokens.slice(-1)[0],
            type: 'file',
            size: 10,
            create_ts: getCurrentDateForFileSystem()
        }
    }

    if (obj.type === 'directory') {
        return [`${tokens[1]} is a directory`]
    }
    else {
        const contents: string[] = obj.content ? obj.content.split('\n') : ['']
        return [OPEN_VIM_FLAG, ...contents]
    }
}

export async function executeCode(tokens: string[], fileSystem: EmulatedFileSystem | null, location: string[]): Promise<string[]> {

    // Validate inputs
    if(tokens.length < 2) {
        return ["Please provide a file to execute. Usage: EXEC [file_name] -in (input)"]
    }
    else if(tokens[1].toUpperCase() === 'LANGS') {
        return ["Supported Languages: ", ...listSupportedLanguages()]
    }
    else if(!tokens[1].includes('.')) {
        return ["Please provide a valid filename with an extension. Usage: EXEC [file_name] -in (input)"]
    }

    // Get the language
    const language: JDoodleLanguage | null = determineLanguageFromExtension(tokens[1])

    if(!language) {
        return ["Extension type " + tokens[1].split('.')[1] + " is not supported. Run `EXEC LANGS` to get a list of supported types."]
    }

    // Resolve path segments so "ethan95/test.py" navigates into the subdirectory
    const parts = tokens[1].replace(/\\/g, '/').split('/')
    const filename = parts[parts.length - 1]
    const targetLocation = resolvePath(parts.slice(0, -1), location)

    // Find the target file
    const file: EmulatedFileSystemObject | null = getObjectFromDirectory(fileSystem!, targetLocation, filename)

    if(!file) {
        return ["No file found: " + tokens[1]]
    }
    console.log(file)

    const inFlag = tokens.findIndex(t => t.toLowerCase() === '-in')
    const stdin = inFlag !== -1 ? tokens.slice(inFlag + 1).join(' ') : ''

    const jdoodleRequestBody: CompileRequest = {
        script: file?.content ?? '',
        stdin,
        language: language.language,
        versionIndex: language.versionIndex.toString()
    }

    const res = await fetch('/api/compile', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(jdoodleRequestBody)
    })

    const data: CompileResponse = await res.json()
    
    console.log(data)

    return [ data.output ]
        
}

const determineLanguageFromExtension = (filename: string): JDoodleLanguage | null => {
    const ext = filename.split('.')[1]
    return extensionToLanguage(ext)
}