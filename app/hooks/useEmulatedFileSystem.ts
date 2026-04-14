'use client'

import { useState, useEffect, useRef } from 'react';
import { autofill, cat, changeDirectory, createDirectory, createFile, deleteFile, echo, editFile, listDirectory, updateFile } from '../helpers/CommandHelpers';
import { APPLICATIONS } from '../applications';
import peter from '../helpers/peter';

type EmulatedFileSystemObject = {
    name: string;
    type: 'file' | 'directory';
    size?: number; // Bytes
    create_ts: string;
    content?: string; // Only for files
    children?: EmulatedFileSystemObject[]; // Only for directories
}

type EmulatedFileSystem = {
    contents: EmulatedFileSystemObject[]
}

const BASE_FILE_SYSTEM: EmulatedFileSystem = {
    contents: [
        {
            name: 'home',
            type: 'directory',
            create_ts: '04-05-26  12:00a',
            children: [
                {
                    name: 'user',
                    create_ts: '04-05-26  12:00a',
                    type: 'directory',
                    children: [
                        {
                            name: 'ethan95',
                            create_ts: '04-05-26  12:00a',
                            type: 'directory',
                            children: [
                                {
                                    name: 'readme.txt',
                                    size: 90,
                                    create_ts: '04-05-26  12:00a',
                                    type: 'file',
                                    content: 'Welcome to the emulated filesystem!\nThis is a simple text file to demonstrate the structure of the filesystem.\nYou can create, read, update, and delete files and directories within this emulated environment.\n\nFeel free to explore and experiment with the filesystem!'
                                }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            name: 'etc',
            create_ts: '04-05-26  12:00a',
            type: 'directory',
            children: []
        },
        {
            name: 'var',
            create_ts: '04-05-26  12:00a',
            type: 'directory',
            children: []
        }
    ]
};

export const OPEN_VIM_FLAG = '==== OPEN VIM EDITOR ===='

export const BASE_LOCATION = ['home', 'user', 'ethan95']

const HELP_LINES: string[] = [
    '',
    'CD / CHDIR    Changes the current directory.',
    'CLS / CLEAR   Clears the screen.',
    'CAT           Displays the contents of a file.',
    'DATE          Displays the current date.',
    'DEL / RM      Deletes files or directories. Use -r to delete recursively.',
    'DIR / LS      Displays a list of files and subdirectories.',
    'ECHO          Displays messages, or turns command echoing on or off.',
    'EDIT / VI     Starts the file editor.',
    'EXIT          Quits the current session.',
    'HELP          Provides help information for commands.',
    'MKDIR         Creates a directory.',
    'PROGRAMS      Lists available programs.',
    'RUN           Starts a program.',
    'TIME          Displays the current time.',
    'TOUCH         Creates an empty file.',
    'VER           Displays the system version.',
    '',
]

export function useEmulatedFileSystem() {
    const [fileSystem, setFileSystem] = useState<EmulatedFileSystem | null>(BASE_FILE_SYSTEM);
    const [location, setLocation] = useState<string[]>([]);
    const hydrated = useRef(false);

    useEffect(() => {
        const fs = localStorage.getItem('filesystem');
        if (fs !== null) {
            setFileSystem(JSON.parse(fs));
        }
        hydrated.current = true;
        setLocation([...BASE_LOCATION])
    }, []);

    useEffect(() => {
        if (!hydrated.current) return;
        console.log(fileSystem)
        localStorage.setItem('filesystem', JSON.stringify(fileSystem));
    }, [fileSystem])

    const tokenizeCommand = (raw: string): string[] => {
        const trimmed = raw.trim();
        if (!trimmed) return [];
        const parts = trimmed.split(/\s+/);
        return parts;
    }

    const processCommand = (raw: string, windowId: string, openWindow: (id: string) => void, closeWindow: (id: string) => void): string[] | null => {
        console.log('Processing command:', raw);
        console.log('data: ', { fileSystem, location, windowId });

        const tokens: string[] = tokenizeCommand(raw)
        if (tokens.length === 0) return [];

        switch (tokens[0].toUpperCase()) {

            case 'CLEAR':
            case 'CLS':
                // Returning a NULL triggers the screen to clear.
                return null

            case 'CD':
            case 'CHDIR':
                return changeDirectory(tokens, fileSystem, location, setLocation)

            case 'LS':
            case 'DIR':
                return listDirectory(tokens, fileSystem, location)

            case 'MKDIR':
                return createDirectory(tokens, fileSystem, location, setFileSystem)

            case "ECHO":
                return echo(tokens)

            case 'CAT':
                return cat(tokens, fileSystem, location)

            case 'TOUCH':
                return createFile(tokens, fileSystem, location, setFileSystem)

            case 'VI':
            case 'VIM':
            case 'EDIT':
                return editFile(tokens, fileSystem, location, setFileSystem)

            case 'RM':
            case 'DEL':
                return deleteFile(tokens, fileSystem, location, setFileSystem)

            case 'VER':
                return ['', 'ETHAN-DOS Version 6.22', ''];

            case 'HELP':
                return HELP_LINES;

            case 'ECHO':
                if (tokens.length === 1) return ['ECHO is on.'];
                if (tokens[1].toUpperCase() === 'ON') return ['ECHO is on.'];
                if (tokens[1].toUpperCase() === 'OFF') return ['ECHO is off.'];
                return [tokens.join(' ')];

            case 'DATE': {
                const d = new Date();
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                return [`Current date is ${days[d.getDay()]} ${mm}-${dd}-${d.getFullYear()}`];
            }

            case 'TIME': {
                const t = new Date();
                const hh = String(t.getHours()).padStart(2, '0');
                const mm = String(t.getMinutes()).padStart(2, '0');
                const ss = String(t.getSeconds()).padStart(2, '0');
                const cs = String(Math.floor(t.getMilliseconds() / 10)).padStart(2, '0');
                return [`Current time is ${hh}:${mm}:${ss}.${cs}`];
            }

            case 'TYPE':
                // if (args.length === 0) return ['Required parameter missing'];
                // return [`File not found - ${args[0].toUpperCase()}`];
                return ["To be created"]

            case 'EXIT':
                closeWindow(windowId);
                return [];

            case 'PROGRAMS':
                return APPLICATIONS.map(app => app.id + '.exe') || [];

            case 'RUN':
                if (tokens.length === 1) return ['Required parameter missing'];
                const progName = tokens[1].toUpperCase().replace(/\.EXE$/, '');
                const app = APPLICATIONS.find(a => a.id.toUpperCase() === progName);
                if (app) {
                    openWindow(app.id);
                    return ['Opening program ' + app.name + '...'];
                }   
                else {
                    return [`'${tokens[1]}' is not recognized as an internal or external command, operable program or batch file.`];
                }

            // Start Easter Eggs :)
            case 'FAMILY':
                if(tokens[1]?.toUpperCase() === 'GUY') return peter();

            default:
                return [`Command not found: ${tokens[0]}`]
        }
    }

    const processAutofill = (input: string, fileSystem: EmulatedFileSystem | null): string[] => {
        return autofill(input, fileSystem, location)
    }

    const processUpdateFile = (content: string, path: string) => {

        console.log('Update file: ', path, ' with content: ', content)

        if(!fileSystem) return []

        updateFile(fileSystem, path, location, setFileSystem, content)

        // const file = getObjectFromDirectory(fileSystem, location, path)
        // file!.content = content

        // const newFileSystem = { ...fileSystem }

        // const pathParts = path.replaceAll('/', '\\').split('\\').filter(p => p.length())

    }

    return [fileSystem, location, processCommand, processAutofill, processUpdateFile] as const;
}

export type { EmulatedFileSystem, EmulatedFileSystemObject }