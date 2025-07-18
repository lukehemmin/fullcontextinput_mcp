#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

class FullContextInputMCPServer {
  constructor() {
    this.server = new Server({
      name: 'fullcontextinput_mcp',
      version: '1.0.1',
    }, {
      capabilities: {
        tools: {},
        resources: {},
      },
    });

    this.setupHandlers();
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'extract_file_content',
            description: '프롬프트에서 파일명을 추출하고 해당 파일의 전체 코드를 반환합니다.',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: '분석할 프롬프트 텍스트'
                },
                workspace_path: {
                  type: 'string',
                  description: '워크스페이스 경로 (선택사항)',
                  default: '.'
                }
              },
              required: ['prompt']
            }
          },
          {
            name: 'read_file_content',
            description: '지정된 파일의 전체 내용을 읽습니다.',
            inputSchema: {
              type: 'object',
              properties: {
                file_path: {
                  type: 'string',
                  description: '읽을 파일의 경로'
                }
              },
              required: ['file_path']
            }
          },
          {
            name: 'find_files',
            description: '프로젝트에서 특정 패턴의 파일들을 찾습니다.',
            inputSchema: {
              type: 'object',
              properties: {
                pattern: {
                  type: 'string',
                  description: '검색할 파일 패턴 (예: *.js, *.py, src/**/*.ts)'
                },
                workspace_path: {
                  type: 'string',
                  description: '검색할 워크스페이스 경로',
                  default: '.'
                }
              },
              required: ['pattern']
            }
          },
          {
            name: 'read_directory_context',
            description: '디렉토리의 모든 코드 파일을 재귀적으로 읽어 전체 컨텍스트를 제공합니다.',
            inputSchema: {
              type: 'object',
              properties: {
                directory_path: {
                  type: 'string',
                  description: '읽을 디렉토리 경로 (절대경로 또는 상대경로)'
                },
                max_depth: {
                  type: 'integer',
                  description: '최대 탐색 깊이 (기본값: 10)',
                  default: 10
                },
                include_extensions: {
                  type: 'array',
                  description: '포함할 파일 확장자 목록 (기본값: 일반적인 코드 파일)',
                  items: { type: 'string' }
                }
              },
              required: ['directory_path']
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'extract_file_content':
            return await this.extractFileContent(args.prompt, args.workspace_path || '.');
          
          case 'read_file_content':
            return await this.readFileContent(args.file_path);
          
          case 'find_files':
            return await this.findFiles(args.pattern, args.workspace_path || '.');
          
          case 'read_directory_context':
            return await this.readDirectoryContext(
              args.directory_path, 
              args.max_depth || 10, 
              args.include_extensions
            );
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ]
        };
      }
    });

    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: []
      };
    });
  }

  // 프롬프트에서 파일명 추출 및 코드 반환
  async extractFileContent(prompt, workspacePath) {
    const filePatterns = this.extractFilePatterns(prompt);
    const directoryPaths = this.extractDirectoryPatterns(prompt);
    const results = [];

    // 파일 패턴 처리
    for (const pattern of filePatterns) {
      try {
        const files = await this.findMatchingFiles(pattern, workspacePath);
        for (const file of files) {
          const content = await this.readFileContent(file);
          results.push({
            file: file,
            content: content.content[0].text
          });
        }
      } catch (error) {
        results.push({
          file: pattern,
          error: error.message
        });
      }
    }

    // 디렉토리 패턴 처리
    for (const dirPath of directoryPaths) {
      try {
        const dirContext = await this.readDirectoryContext(dirPath, 10);
        const dirContent = JSON.parse(dirContext.content[0].text);
        
        results.push({
          directory: dirPath,
          files: dirContent.files,
          total_files: dirContent.total_files,
          structure: dirContent.directory_structure
        });
      } catch (error) {
        results.push({
          directory: dirPath,
          error: error.message
        });
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            extracted_files: filePatterns,
            extracted_directories: directoryPaths,
            file_contents: results,
            total_files: results.length
          }, null, 2)
        }
      ]
    };
  }

  // 프롬프트에서 파일 패턴 추출
  extractFilePatterns(prompt) {
    const patterns = [];
    
    // 다양한 파일 패턴 매칭
    const fileRegexes = [
      /([a-zA-Z0-9_\-\./\\]+\.[a-zA-Z0-9]+)/g,  // 파일명.확장자
      /`([^`]+\.[a-zA-Z0-9]+)`/g,                 // 백틱으로 감싸진 파일명
      /"([^"]+\.[a-zA-Z0-9]+)"/g,                 // 따옴표로 감싸진 파일명
      /'([^']+\.[a-zA-Z0-9]+)'/g,                 // 작은따옴표로 감싸진 파일명
    ];

    for (const regex of fileRegexes) {
      let match;
      while ((match = regex.exec(prompt)) !== null) {
        const filePath = match[1];
        if (!patterns.includes(filePath)) {
          patterns.push(filePath);
        }
      }
    }

    return patterns;
  }

  // 프롬프트에서 디렉토리 패턴 추출
  extractDirectoryPatterns(prompt) {
    const patterns = [];
    
    // 다양한 디렉토리 패턴 매칭
    const directoryRegexes = [
      /@([a-zA-Z0-9_\-\./\\]+)/g,                     // @경로/경로
      /(?:^|\s)([a-zA-Z0-9_\-\./\\]+\/[a-zA-Z0-9_\-\./\\]*)/g,  // 경로/경로
      /`([^`]+\/[^`]*)`/g,                             // 백틱으로 감싸진 경로
      /"([^"]+\/[^"]*)"/g,                           // 따옴표로 감싸진 경로
      /'([^']+\/[^']*)'/g,                             // 작은따옴표로 감싸진 경로
    ];

    for (const regex of directoryRegexes) {
      let match;
      while ((match = regex.exec(prompt)) !== null) {
        let dirPath = match[1];
        
        // @ 접두사 제거
        if (dirPath.startsWith('@')) {
          dirPath = dirPath.substring(1);
        }
        
        // 파일 확장자가 있는 경우 제외 (이미 파일 패턴에서 처리됨)
        if (!/\.[a-zA-Z0-9]+$/.test(dirPath) && !patterns.includes(dirPath)) {
          patterns.push(dirPath);
        }
      }
    }

    return patterns;
  }

  // 파일 패턴으로 실제 파일 찾기
  async findMatchingFiles(pattern, workspacePath) {
    const fullPattern = path.join(workspacePath, pattern);
    
    try {
      const files = await glob(fullPattern, {
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
        absolute: true
      });
      return files;
    } catch (error) {
      // 정확한 파일 경로인 경우 직접 확인
      const fullPath = path.resolve(workspacePath, pattern);
      if (fs.existsSync(fullPath)) {
        return [fullPath];
      }
      return [];
    }
  }

  // 파일 내용 읽기
  async readFileContent(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const stats = fs.statSync(filePath);
      
      return {
        content: [
          {
            type: 'text',
            text: `파일: ${filePath}
크기: ${stats.size} bytes
수정일: ${stats.mtime.toISOString()}

=== 파일 내용 ===
${content}
=== 파일 내용 끝 ===`
          }
        ]
      };
    } catch (error) {
      throw new Error(`파일을 읽을 수 없습니다: ${filePath} - ${error.message}`);
    }
  }

  // 파일 검색
  async findFiles(pattern, workspacePath) {
    try {
      const files = await glob(pattern, {
        cwd: workspacePath,
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
        absolute: true
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              pattern: pattern,
              workspace: workspacePath,
              files: files,
              count: files.length
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`파일 검색 실패: ${error.message}`);
    }
  }

  // 디렉토리 컨텍스트 읽기 (재귀적으로 모든 코드 파일 읽기)
  async readDirectoryContext(directoryPath, maxDepth = 10, includeExtensions = null) {
    try {
      const fullPath = path.resolve(directoryPath);
      
      // 기본 코드 파일 확장자
      const defaultExtensions = [
        'js', 'ts', 'jsx', 'tsx', 'vue', 'svelte', 'py', 'java', 'cpp', 'c', 'h', 'hpp',
        'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'clj', 'dart', 'r',
        'css', 'scss', 'sass', 'less', 'html', 'htm', 'xml', 'json', 'yaml', 'yml',
        'md', 'markdown', 'txt', 'sql', 'sh', 'bash', 'ps1', 'dockerfile', 'makefile'
      ];
      
      const extensions = includeExtensions || defaultExtensions;
      
      // 디렉토리 존재 확인
      if (!fs.existsSync(fullPath)) {
        throw new Error(`디렉토리가 존재하지 않습니다: ${directoryPath}`);
      }
      
      const stats = fs.statSync(fullPath);
      if (!stats.isDirectory()) {
        throw new Error(`지정된 경로는 디렉토리가 아닙니다: ${directoryPath}`);
      }
      
      // 재귀적으로 파일 수집
      const allFiles = [];
      const directoryStructure = [];
      
      await this.collectFilesRecursively(fullPath, allFiles, directoryStructure, extensions, 0, maxDepth);
      
      // 각 파일 내용 읽기
      const fileContents = [];
      let totalSize = 0;
      
      for (const file of allFiles) {
        try {
          const content = fs.readFileSync(file, 'utf8');
          const fileStats = fs.statSync(file);
          const relativePath = path.relative(fullPath, file);
          
          fileContents.push({
            path: relativePath,
            absolute_path: file,
            size: fileStats.size,
            modified: fileStats.mtime.toISOString(),
            extension: path.extname(file).substring(1),
            content: content
          });
          
          totalSize += fileStats.size;
        } catch (error) {
          fileContents.push({
            path: path.relative(fullPath, file),
            absolute_path: file,
            error: `파일 읽기 실패: ${error.message}`
          });
        }
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              directory: directoryPath,
              absolute_path: fullPath,
              total_files: allFiles.length,
              total_size: totalSize,
              max_depth: maxDepth,
              included_extensions: extensions,
              directory_structure: directoryStructure,
              files: fileContents
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`디렉토리 컨텍스트 읽기 실패: ${error.message}`);
    }
  }
  
  // 재귀적으로 파일 수집하는 헬퍼 메서드
  async collectFilesRecursively(dirPath, allFiles, structure, extensions, currentDepth, maxDepth) {
    if (currentDepth >= maxDepth) {
      return;
    }
    
    const items = fs.readdirSync(dirPath);
    const currentLevel = [];
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      // 무시할 디렉토리/파일 패턴
      const ignorePattens = [
        'node_modules', '.git', 'dist', 'build', '.next', '.nuxt', 
        'coverage', '.nyc_output', '.cache', '.vscode', '.idea',
        'tmp', 'temp', '.DS_Store', 'Thumbs.db'
      ];
      
      if (ignorePattens.some(pattern => item.includes(pattern))) {
        continue;
      }
      
      if (stats.isDirectory()) {
        const subStructure = [];
        currentLevel.push({
          name: item,
          type: 'directory',
          children: subStructure
        });
        
        await this.collectFilesRecursively(itemPath, allFiles, subStructure, extensions, currentDepth + 1, maxDepth);
      } else if (stats.isFile()) {
        const ext = path.extname(item).substring(1).toLowerCase();
        
        if (extensions.includes(ext)) {
          allFiles.push(itemPath);
          currentLevel.push({
            name: item,
            type: 'file',
            extension: ext,
            size: stats.size
          });
        }
      }
    }
    
    structure.push(...currentLevel);
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('FullContextInput MCP 서버가 시작되었습니다.');
  }
}

const server = new FullContextInputMCPServer();
server.run().catch(console.error);
