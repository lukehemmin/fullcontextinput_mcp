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
      version: '1.0.5',
    }, {
      capabilities: {
        tools: {},
        resources: {},
      },
    });

    // Rate Limiting 설정
    this.rateLimiter = {
      lastRequestTime: 0,
      minDelay: 1000, // 최소 1초 대기
      requestCount: 0,
      resetTime: Date.now() + 60000 // 1분마다 리셋
    };
    
    // 파일 캐시 (중복 요청 방지)
    this.fileCache = new Map();
    this.cacheTimeout = 30000; // 30초 캐시

    this.setupHandlers();
  }

  // Rate Limiting 및 지연 처리
  async waitForRateLimit() {
    const now = Date.now();
    
    // 1분마다 카운터 리셋
    if (now > this.rateLimiter.resetTime) {
      this.rateLimiter.requestCount = 0;
      this.rateLimiter.resetTime = now + 60000;
    }
    
    // 요청 수 증가
    this.rateLimiter.requestCount++;
    
    // 최소 대기 시간 계산
    const timeSinceLastRequest = now - this.rateLimiter.lastRequestTime;
    let delayNeeded = this.rateLimiter.minDelay - timeSinceLastRequest;
    
    // 요청이 많을수록 더 오래 대기
    if (this.rateLimiter.requestCount > 10) {
      delayNeeded = Math.max(delayNeeded, 2000); // 2초
    } else if (this.rateLimiter.requestCount > 5) {
      delayNeeded = Math.max(delayNeeded, 1500); // 1.5초
    }
    
    if (delayNeeded > 0) {
      console.warn(`Rate limit 방지를 위해 ${delayNeeded}ms 대기 중...`);
      await new Promise(resolve => setTimeout(resolve, delayNeeded));
    }
    
    this.rateLimiter.lastRequestTime = Date.now();
  }
  
  // 파일 캐시 검사
  getCachedFile(filePath) {
    const cached = this.fileCache.get(filePath);
    if (cached && (Date.now() - cached.timestamp < this.cacheTimeout)) {
      return cached.content;
    }
    return null;
  }
  
  // 파일 캐시 저장
  setCachedFile(filePath, content) {
    this.fileCache.set(filePath, {
      content: content,
      timestamp: Date.now()
    });
    
    // 캐시 크기 제한 (100개)
    if (this.fileCache.size > 100) {
      const firstKey = this.fileCache.keys().next().value;
      this.fileCache.delete(firstKey);
    }
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
            description: '파일 패턴으로 검색하여 매칭되는 파일 목록을 반환합니다.',
            inputSchema: {
              type: 'object',
              properties: {
                pattern: {
                  type: 'string',
                  description: '검색할 파일 패턴 (glob 형식)'
                },
                workspace_path: {
                  type: 'string',
                  description: '검색할 작업영역 경로'
                }
              },
              required: ['pattern', 'workspace_path']
            }
          },
          {
            name: 'analyze_prompt_for_files',
            description: '사용자 프롬프트를 분석하여 파일/디렉토리 요청을 자동 감지하고 적절한 MCP 도구를 제안합니다.',
            inputSchema: {
              type: 'object',
              properties: {
                user_prompt: {
                  type: 'string',
                  description: '분석할 사용자 프롬프트'
                },
                workspace_path: {
                  type: 'string',
                  description: '기본 작업영역 경로 (선택사항)',
                  default: process.cwd()
                }
              },
              required: ['user_prompt']
            }
          },
          {
            name: 'read_directory_structure',
            description: '디렉토리 구조와 파일 메타데이터만 제공합니다 (파일 내용 제외). 컨텍스트 초과 방지를 위한 사전 분석용.',
            inputSchema: {
              type: 'object',
              properties: {
                directory_path: {
                  type: 'string',
                  description: '분석할 디렉토리 경로 (절대경로 또는 상대경로)'
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
          },
          {
            name: 'read_file_smart',
            description: '파일 크기에 따라 지능적으로 읽기 방식을 결정합니다. 200줄 미만은 전체, 200줄 이상은 자동으로 청크 제공.',
            inputSchema: {
              type: 'object',
              properties: {
                file_path: {
                  type: 'string',
                  description: '읽을 파일의 경로'
                },
                chunk_number: {
                  type: 'integer',
                  description: '큰 파일의 경우 읽을 청크 번호 (기본값: 0)',
                  default: 0
                },
                lines_per_chunk: {
                  type: 'integer',
                  description: '청크당 라인 수 (기본값: 200줄)',
                  default: 200
                }
              },
              required: ['file_path']
            }
          },
          {
            name: 'read_directory_context',
            description: '디렉토리의 모든 코드 파일을 재귀적으로 읽어 전체 컨텍스트를 제공합니다. 컨텍스트 초과 방지 기능 포함.',
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
                max_files: {
                  type: 'integer',
                  description: '최대 파일 수 (기본값: 50)',
                  default: 50
                },
                max_file_size: {
                  type: 'integer',
                  description: '최대 파일 크기 (bytes, 기본값: 50KB)',
                  default: 51200
                },
                max_total_size: {
                  type: 'integer',
                  description: '최대 총 컨텍스트 크기 (bytes, 기본값: 500KB)',
                  default: 512000
                },
                include_extensions: {
                  type: 'array',
                  description: '포함할 파일 확장자 목록 (기본값: 일반적인 코드 파일)',
                  items: { type: 'string' }
                },
                prioritize_important: {
                  type: 'boolean',
                  description: '중요한 파일 우선 순위 (기본값: true)',
                  default: true
                }
              },
              required: ['directory_path']
            }
          },
          {
            name: 'get_file_info',
            description: '파일의 기본 정보만 확인합니다. (크기, 수정일, 줄 수 등, 내용 제외)',
            inputSchema: {
              type: 'object',
              properties: {
                file_path: {
                  type: 'string',
                  description: '확인할 파일의 경로'
                }
              },
              required: ['file_path']
            }
          },
          {
            name: 'read_file_chunk',
            description: '큰 파일을 라인 단위로 안전하게 나눠서 읽습니다. (코드 깨짐 방지)',
            inputSchema: {
              type: 'object',
              properties: {
                file_path: {
                  type: 'string',
                  description: '읽을 파일의 경로'
                },
                lines_per_chunk: {
                  type: 'integer',
                  description: '청크당 라인 수 (기본값: 200줄)',
                  default: 200
                },
                chunk_number: {
                  type: 'integer',
                  description: '읽을 청크 번호 (0부터 시작)',
                  default: 0
                }
              },
              required: ['file_path']
            }
          },
          {
            name: 'read_file_lines',
            description: '파일의 지정된 라인 범위만 읽습니다.',
            inputSchema: {
              type: 'object',
              properties: {
                file_path: {
                  type: 'string',
                  description: '읽을 파일의 경로'
                },
                start_line: {
                  type: 'integer',
                  description: '시작 라인 번호 (1부터 시작)',
                  default: 1
                },
                end_line: {
                  type: 'integer',
                  description: '끝 라인 번호 (비어있으면 파일 끝까지)'
                },
                max_lines: {
                  type: 'integer',
                  description: '최대 라인 수 (기본값: 100)',
                  default: 100
                }
              },
              required: ['file_path']
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
          
          case 'read_directory_structure':
            return await this.readDirectoryStructure(
              args.directory_path,
              args.max_depth || 10,
              args.include_extensions
            );
          
          case 'read_file_smart':
            return await this.readFileSmart(
              args.file_path,
              args.chunk_number || 0,
              args.lines_per_chunk || 200
            );
          
          case 'read_directory_context':
            return await this.readDirectoryContext(
              args.directory_path, 
              args.max_depth || 10, 
              args.include_extensions,
              args.max_files || 50,
              args.max_file_size || 51200,
              args.max_total_size || 512000,
              args.prioritize_important !== false
            );
          
          case 'get_file_info':
            return await this.getFileInfo(args.file_path);
          
          case 'read_file_chunk':
            return await this.readFileChunk(
              args.file_path,
              args.lines_per_chunk || 200,
              args.chunk_number || 0
            );
          
          case 'read_file_lines':
            return await this.readFileLines(
              args.file_path,
              args.start_line || 1,
              args.end_line,
              args.max_lines || 100
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

  // 파일 내용 읽기 (Rate Limiting 적용, 큰 파일 감지)
  async readFileContent(filePath) {
    try {
      // Rate Limiting 대기
      await this.waitForRateLimit();
      
      // 캐시 확인
      const cached = this.getCachedFile(filePath);
      if (cached) {
        console.log(`캐시된 파일 사용: ${filePath}`);
        return cached;
      }
      
      const stats = fs.statSync(filePath);
      const lines = fs.readFileSync(filePath, 'utf8').split('\n');
      const totalLines = lines.length;
      
      // 지능형 파일 읽기 전략
      const sizeKB = Math.round(stats.size / 1024);
      
      let result;
      
      if (stats.size > 20480) { // 20KB 초과
        // 매우 큰 파일: 바로 200줄씩 분할 제공
        const first200Lines = lines.slice(0, 200);
        const remainingLines = totalLines - 200;
        
        result = {
          content: [
            {
              type: 'text',
              text: `파일: ${filePath}
크기: ${stats.size} bytes (${sizeKB}KB)
라인 수: ${totalLines}
수정일: ${stats.mtime.toISOString()}

🤖 지능형 대용량 파일 읽기 모드
파일이 ${sizeKB}KB로 커서 200줄씩 자동 분할하여 제공합니다.

=== 1-200줄 (${remainingLines > 0 ? `남은 줄: ${remainingLines}` : '마지막'}) ===
${first200Lines.join('\n')}
=== 200줄 단위 완료 ===

${remainingLines > 0 ? `💡 다음 200줄을 읽으려면:
read_file_lines(file_path="${filePath}", start_line=201, end_line=400)

또는 스마트 청크로 읽으려면:
read_file_chunk(file_path="${filePath}", lines_per_chunk=200, chunk_number=1)` : '🎉 파일을 모두 읽었습니다!'}`
            }
          ]
        };
      } else if (stats.size > 10240 || totalLines > 200) { // 10KB 초과 또는 200줄 초과
        // 중간 크기 파일: 전체 제공 + 완독 체크 마커
        const content = lines.join('\n');
        result = {
          content: [
            {
              type: 'text',
              text: `파일: ${filePath}
크기: ${stats.size} bytes (${sizeKB}KB)
라인 수: ${totalLines}
수정일: ${stats.mtime.toISOString()}

📜 중간 크기 파일 완전 제공 모드
이 파일은 ${sizeKB}KB, ${totalLines}줄입니다. 전체 내용을 제공합니다.

=== 파일 전체 내용 ===
${content}
=== 파일 완료 (${totalLines}/${totalLines} 라인) FULL_FILE_READ_COMPLETE ===

🔍 만약 위 내용이 잘렸다면:
- read_file_lines(file_path="${filePath}", start_line=1, end_line=200) // 200줄씩
- read_file_chunk(file_path="${filePath}", lines_per_chunk=200, chunk_number=0) // 스마트 청크`
            }
          ]
        };
      } else {
        // 작은 파일: 전체 제공 + 완독 마커
        const content = lines.join('\n');
        result = {
          content: [
            {
              type: 'text',
              text: `파일: ${filePath}
크기: ${stats.size} bytes (${sizeKB}KB)
라인 수: ${totalLines}
수정일: ${stats.mtime.toISOString()}

✅ 소형 파일 완전 제공
이 파일은 ${sizeKB}KB, ${totalLines}줄로 완전히 읽을 수 있습니다.

=== 파일 전체 내용 ===
${content}
=== 파일 완료 (${totalLines}/${totalLines} 라인) FULL_FILE_READ_COMPLETE ===`
            }
          ]
        };
      }
      
      // 결과 캐시 저장
      this.setCachedFile(filePath, result);
      
      return result;
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
              directory: workspacePath,
              total_files_found: files.length,
              files_included: files.length,
              files_skipped: 0,
              total_context_size: 0,
              max_limits: {
                max_files: 50,
                max_file_size: 51200,
                max_total_size: 512000
              },
              files: files.map(file => ({ path: file })),
              skipped_files: []
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`파일 검색 실패: ${error.message}`);
    }
  }

  // 디렉토리 컨텍스트 읽기 (재귀적으로 모든 코드 파일 읽기) - 컨텍스트 초과 방지
  async readDirectoryContext(directoryPath, maxDepth = 10, includeExtensions = null, maxFiles = 50, maxFileSize = 51200, maxTotalSize = 512000, prioritizeImportant = true) {
    try {
      // Rate Limiting 대기 (디렉토리는 더 오래 대기)
      await this.waitForRateLimit();
      await new Promise(resolve => setTimeout(resolve, 500)); // 추가 0.5초 대기
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
      
      // 파일 우선순위 및 필터링
      const processedFiles = this.prioritizeAndFilterFiles(allFiles, fullPath, maxFiles, maxFileSize, prioritizeImportant);
      
      // 각 파일 내용 읽기 (컨텍스트 초과 방지)
      const fileContents = [];
      const skippedFiles = [];
      let totalSize = 0;
      
      for (const fileInfo of processedFiles) {
        try {
          // 최대 총 크기 검사
          if (totalSize + fileInfo.size > maxTotalSize) {
            skippedFiles.push({
              path: fileInfo.relativePath,
              size: fileInfo.size,
              reason: `최대 총 컨텍스트 크기 초과 (${Math.round(maxTotalSize/1024)}KB 제한)`
            });
            continue;
          }
          
          const content = fs.readFileSync(fileInfo.file, 'utf8');
          
          fileContents.push({
            path: fileInfo.relativePath,
            absolute_path: fileInfo.file,
            size: fileInfo.size,
            modified: fileInfo.modified,
            extension: fileInfo.extension,
            priority: fileInfo.priority,
            content: content
          });
          
          totalSize += fileInfo.size;
        } catch (error) {
          fileContents.push({
            path: fileInfo.relativePath,
            absolute_path: fileInfo.file,
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
  
  // 파일 우선순위 및 필터링
  prioritizeAndFilterFiles(allFiles, basePath, maxFiles, maxFileSize, prioritizeImportant) {
    const filesWithInfo = [];
    
    for (const file of allFiles) {
      try {
        const stats = fs.statSync(file);
        const relativePath = path.relative(basePath, file);
        const ext = path.extname(file).substring(1).toLowerCase();
        
        // 파일 크기 제한 확인
        if (stats.size > maxFileSize) {
          console.warn(`파일 크기 초과 건너뛰기: ${relativePath} (${Math.round(stats.size/1024)}KB > ${Math.round(maxFileSize/1024)}KB)`);
          continue;
        }
        
        // 우선순위 계산
        let priority = 0;
        if (prioritizeImportant) {
          priority = this.calculateFilePriority(relativePath, ext, stats.size);
        }
        
        filesWithInfo.push({
          file: file,
          relativePath: relativePath,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          extension: ext,
          priority: priority
        });
      } catch (error) {
        console.warn(`파일 정보 읽기 실패: ${file} - ${error.message}`);
      }
    }
    
    // 우선순위에 따라 정렬 및 개수 제한
    if (prioritizeImportant) {
      filesWithInfo.sort((a, b) => b.priority - a.priority);
    }
    
    return filesWithInfo.slice(0, maxFiles);
  }
  
  // 파일 우선순위 계산
  calculateFilePriority(relativePath, extension, size) {
    let priority = 0;
    const fileName = path.basename(relativePath).toLowerCase();
    const dirName = path.dirname(relativePath).toLowerCase();
    
    // 중요한 파일명 가점
    const importantFiles = ['index', 'main', 'app', 'config', 'package', 'readme'];
    if (importantFiles.some(name => fileName.includes(name))) {
      priority += 50;
    }
    
    // 중요한 디렉토리 가점
    const importantDirs = ['src', 'lib', 'components', 'utils', 'api', 'routes'];
    if (importantDirs.some(dir => dirName.includes(dir))) {
      priority += 30;
    }
    
    // 파일 확장자별 가점
    const extensionPriority = {
      'js': 20, 'ts': 20, 'jsx': 18, 'tsx': 18, 'vue': 18,
      'py': 15, 'java': 15, 'cpp': 15, 'c': 15, 'h': 15,
      'css': 10, 'scss': 10, 'html': 10, 'json': 8, 'md': 5
    };
    priority += extensionPriority[extension] || 0;
    
    // 파일 크기 가점 (작을수록 좋음)
    if (size < 1024) priority += 10;      // 1KB 미만
    else if (size < 10240) priority += 5; // 10KB 미만
    else if (size > 51200) priority -= 10; // 50KB 초과
    
    return priority;
  }

  // 프롬프트 분석 및 자동 파일/디렉토리 감지
  async analyzePromptForFiles(userPrompt, workspacePath) {
    try {
      const analysis = {
        detected_files: [],
        detected_directories: [],
        suggested_actions: [],
        confidence_score: 0
      };

      // 파일 패턴 감지
      const filePatterns = this.extractFilePatterns(userPrompt);
      const directoryPatterns = this.extractDirectoryPatterns(userPrompt);
      
      // 추가 키워드 기반 감지
      const keywords = {
        directory_analysis: ['분석해줘', '확인해줘', '살펴봐', '검토해줘', '디렉토리', '폴더', '프로젝트'],
        file_read: ['파일', '코드', '내용', '소스'],
        exclude_patterns: ['node_modules', '.git', 'dist', 'build']
      };

      let confidence = 0;
      const suggestions = [];

      // 디렉토리 분석 요청 감지
      if (keywords.directory_analysis.some(keyword => userPrompt.includes(keyword))) {
        confidence += 30;
        
        // 디렉토리 패턴이 있으면 우선 사용
        if (directoryPatterns.length > 0) {
          analysis.detected_directories = directoryPatterns;
          confidence += 40;
          suggestions.push({
            action: 'read_directory_context',
            target: directoryPatterns[0],
            reason: '디렉토리 분석 요청 감지'
          });
        } else {
          // 현재 디렉토리 분석 제안
          analysis.detected_directories = [workspacePath];
          confidence += 20;
          suggestions.push({
            action: 'read_directory_context',
            target: workspacePath,
            reason: '현재 디렉토리 분석 제안'
          });
        }
      }

      // 파일 읽기 요청 감지
      if (filePatterns.length > 0) {
        analysis.detected_files = filePatterns;
        confidence += 50;
        suggestions.push({
          action: 'read_file_content',
          target: filePatterns[0],
          reason: '파일 경로 감지'
        });
      }

      analysis.confidence_score = Math.min(confidence, 100);
      analysis.suggested_actions = suggestions;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(analysis, null, 2)
        }]
      };
    } catch (error) {
      throw new Error(`프롬프트 분석 실패: ${error.message}`);
    }
  }

  // 파일 정보만 확인 (내용 제외)
  async getFileInfo(filePath) {
    try {
      await this.waitForRateLimit();
      
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const totalLines = lines.length;
      
      // 파일 형식 정보
      const ext = path.extname(filePath).substring(1).toLowerCase();
      const sizeKB = Math.round(stats.size / 1024 * 10) / 10; // 소수점 1자리
      
      // 큰 파일 여부 판단
      const isLarge = stats.size > 15360 || totalLines > 300;
      
      return {
        content: [
          {
            type: 'text',
            text: `파일 정보: ${filePath}

✅ 기본 정보:
- 파일 크기: ${stats.size} bytes (${sizeKB}KB)
- 라인 수: ${totalLines} lines
- 파일 형식: ${ext || '확장자 없음'}
- 수정일: ${stats.mtime.toISOString()}
- 생성일: ${stats.birthtime.toISOString()}

📊 읽기 권장사항:
${isLarge ? 
  `⚠️ 큰 파일 (${sizeKB}KB, ${totalLines}줄)\n- read_file_lines 사용 권장 (예: 1-100줄)\n- read_file_chunk 사용 권장 (10KB씩)` : 
  `✅ 작은 파일\n- read_file_content로 전체 읽기 가능`
}

🔧 사용 가능한 도구:
- read_file_content: 전체 파일 읽기 ${isLarge ? '(큰 파일은 잘릴 수 있음)' : '(권장)'}
- read_file_lines: 라인 범위 지정 읽기 ${isLarge ? '(권장)' : ''}
- read_file_chunk: 청크 단위 읽기 ${isLarge ? '(권장)' : ''}`
          }
        ]
      };
    } catch (error) {
      throw new Error(`파일 정보 확인 실패: ${filePath} - ${error.message}`);
    }
  }

  // 파일 스마트 청크 단위로 읽기 (라인 경계 조정)
  async readFileChunk(filePath, linesPerChunk = 200, chunkNumber = 0) {
    try {
      await this.waitForRateLimit();
      
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const totalLines = lines.length;
      const totalChunks = Math.ceil(totalLines / linesPerChunk);
      
      if (chunkNumber >= totalChunks) {
        throw new Error(`청크 번호가 범위를 벗어났습니다. 총 청크 수: ${totalChunks}, 요청한 청크: ${chunkNumber}`);
      }
      
      const startLine = chunkNumber * linesPerChunk;
      const endLine = Math.min(startLine + linesPerChunk - 1, totalLines - 1);
      
      // 라인 범위로 안전하게 자르기
      const chunkLines = lines.slice(startLine, endLine + 1);
      const chunkContent = chunkLines.join('\n');
      const chunkSizeKB = Math.round(Buffer.byteLength(chunkContent, 'utf8') / 1024);
      
      return {
        content: [
          {
            type: 'text',
            text: `파일: ${filePath}
총 크기: ${stats.size} bytes (${Math.round(stats.size/1024)}KB)
총 라인: ${totalLines}
청크 정보: ${chunkNumber + 1}/${totalChunks} (${linesPerChunk}줄씩)
라인 범위: ${startLine + 1}-${endLine + 1} (이 청크 크기: ${chunkSizeKB}KB)

✅ 스마트 청크 모드 (라인 경계 조정)
코드가 중간에 잘리지 않도록 라인 단위로 안전하게 분할합니다.

=== 청크 ${chunkNumber + 1} (라인 ${startLine + 1}-${endLine + 1}) ===
${chunkContent}
=== 청크 끝 ===

${chunkNumber + 1 < totalChunks ? `💡 다음 청크를 읽으려면:
read_file_chunk(file_path="${filePath}", lines_per_chunk=${linesPerChunk}, chunk_number=${chunkNumber + 1})` : '🎉 모든 청크를 읽었습니다!'}`
          }
        ]
      };
    } catch (error) {
      throw new Error(`파일 청크 읽기 실패: ${filePath} - ${error.message}`);
    }
  }

  // 파일의 특정 라인 범위 읽기
  async readFileLines(filePath, startLine = 1, endLine = null, maxLines = 100) {
    try {
      await this.waitForRateLimit();
      
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const totalLines = lines.length;
      
      // 라인 번호 유효성 검사
      if (startLine < 1) startLine = 1;
      if (startLine > totalLines) {
        throw new Error(`시작 라인이 파일 라인 수를 초과했습니다. 파일 총 라인 수: ${totalLines}`);
      }
      
      // 끝 라인 계산
      let actualEndLine = endLine || Math.min(startLine + maxLines - 1, totalLines);
      actualEndLine = Math.min(actualEndLine, totalLines);
      
      // maxLines 제한 적용
      if (actualEndLine - startLine + 1 > maxLines) {
        actualEndLine = startLine + maxLines - 1;
      }
      
      const selectedLines = lines.slice(startLine - 1, actualEndLine);
      const selectedContent = selectedLines.join('\n');
      
      return {
        content: [
          {
            type: 'text',
            text: `파일: ${filePath}
총 크기: ${stats.size} bytes (${Math.round(stats.size/1024)}KB)
총 라인 수: ${totalLines}
표시 범위: ${startLine}-${actualEndLine} (${actualEndLine - startLine + 1}줄)

=== 라인 ${startLine}-${actualEndLine} ===
${selectedContent}
=== 라인 범위 끝 ===

💡 다른 라인을 읽으려면:
${actualEndLine < totalLines ? `- read_file_lines(file_path="${filePath}", start_line=${actualEndLine + 1}, end_line=${Math.min(actualEndLine + maxLines, totalLines)})` : '- 파일의 모든 라인을 읽었습니다.'}
- read_file_lines(file_path="${filePath}", start_line=1, end_line=${Math.min(100, totalLines)}) // 처음 100줄
- read_file_lines(file_path="${filePath}", start_line=${Math.max(1, totalLines - 99)}, end_line=${totalLines}) // 마지막 100줄`
          }
        ]
      };
    } catch (error) {
      throw new Error(`파일 라인 읽기 실패: ${filePath} - ${error.message}`);
    }
  }

  // 디렉토리 구조와 파일 메타데이터만 제공 (내용 제외)
  async readDirectoryStructure(directoryPath, maxDepth = 10, includeExtensions = null) {
    try {
      await this.waitForRateLimit();
      
      const fullPath = path.resolve(directoryPath);
      
      // 디렉토리 존재 확인
      const stats = fs.statSync(fullPath);
      if (!stats.isDirectory()) {
        throw new Error(`경로가 디렉토리가 아닙니다: ${fullPath}`);
      }
      
      // 기본 확장자 설정
      const extensions = includeExtensions || [
        'js', 'ts', 'jsx', 'tsx', 'vue', 'svelte', 'py', 'java', 'cpp', 'c', 'h', 'hpp',
        'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'clj', 'dart', 'r',
        'css', 'scss', 'sass', 'less', 'html', 'htm', 'xml', 'json', 'yaml', 'yml',
        'md', 'markdown', 'txt', 'sql', 'sh', 'bash', 'ps1', 'dockerfile', 'makefile'
      ];
      
      const allFiles = [];
      const directoryStructure = [];
      
      // 재귀적으로 파일 수집 (메타데이터만)
      await this.collectFilesMetadata(fullPath, allFiles, directoryStructure, extensions, 0, maxDepth);
      
      // 파일 메타데이터 생성
      const filesMetadata = [];
      for (const filePath of allFiles) {
        try {
          const fileStats = fs.statSync(filePath);
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n').length;
          const relativePath = path.relative(fullPath, filePath);
          const ext = path.extname(filePath).substring(1).toLowerCase();
          
          filesMetadata.push({
            path: relativePath,
            absolute_path: filePath,
            size: fileStats.size,
            lines: lines,
            extension: ext,
            modified: fileStats.mtime.toISOString(),
            needsChunking: lines > 200
          });
        } catch (error) {
          console.warn(`파일 메타데이터 읽기 실패: ${filePath} - ${error.message}`);
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
              max_depth: maxDepth,
              included_extensions: extensions,
              directory_structure: directoryStructure,
              files_metadata: filesMetadata,
              summary: {
                small_files: filesMetadata.filter(f => f.lines <= 200).length,
                large_files: filesMetadata.filter(f => f.lines > 200).length,
                total_lines: filesMetadata.reduce((sum, f) => sum + f.lines, 0),
                total_size: filesMetadata.reduce((sum, f) => sum + f.size, 0)
              }
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`디렉토리 구조 읽기 실패: ${directoryPath} - ${error.message}`);
    }
  }
  
  // 파일 메타데이터만 수집하는 재귀 함수
  async collectFilesMetadata(dirPath, allFiles, structure, extensions, currentDepth, maxDepth) {
    if (currentDepth >= maxDepth) return;
    
    try {
      const items = fs.readdirSync(dirPath);
      const currentLevel = [];
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);
        
        // 무시할 패턴
        const ignorePatterns = [
          'node_modules', '.git', 'dist', 'build', '.next', '.nuxt',
          'coverage', '.nyc_output', '.cache', '.vscode', '.idea',
          'tmp', 'temp', '.DS_Store', 'Thumbs.db'
        ];
        
        if (ignorePatterns.some(pattern => item.includes(pattern))) {
          continue;
        }
        
        if (stats.isDirectory()) {
          const subStructure = [];
          currentLevel.push({
            name: item,
            type: 'directory',
            children: subStructure
          });
          
          await this.collectFilesMetadata(itemPath, allFiles, subStructure, extensions, currentDepth + 1, maxDepth);
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
    } catch (error) {
      console.warn(`디렉토리 읽기 실패: ${dirPath} - ${error.message}`);
    }
  }
  
  // 파일 크기에 따라 지능적으로 읽기 방식 결정
  async readFileSmart(filePath, chunkNumber = 0, linesPerChunk = 200) {
    try {
      await this.waitForRateLimit();
      
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const totalLines = lines.length;
      
      // 200줄 미만: 전체 제공
      if (totalLines <= 200) {
        return {
          content: [
            {
              type: 'text',
              text: `파일: ${filePath}
크기: ${stats.size} bytes (${Math.round(stats.size/1024)}KB)
라인 수: ${totalLines}
수정일: ${stats.mtime.toISOString()}

✅ 소형 파일 - 전체 제공
이 파일은 ${totalLines}줄로 전체를 한 번에 제공합니다.

=== 파일 전체 내용 ===
${content}
=== 파일 완료 (${totalLines}/${totalLines} 라인) ===`
            }
          ]
        };
      }
      
      // 200줄 이상: 청크 제공
      const totalChunks = Math.ceil(totalLines / linesPerChunk);
      
      if (chunkNumber >= totalChunks) {
        throw new Error(`청크 번호가 범위를 벗어났습니다. 총 청크 수: ${totalChunks}, 요청한 청크: ${chunkNumber}`);
      }
      
      const startLine = chunkNumber * linesPerChunk;
      const endLine = Math.min(startLine + linesPerChunk - 1, totalLines - 1);
      const chunkLines = lines.slice(startLine, endLine + 1);
      const chunkContent = chunkLines.join('\n');
      const chunkSizeKB = Math.round(Buffer.byteLength(chunkContent, 'utf8') / 1024);
      
      return {
        content: [
          {
            type: 'text',
            text: `파일: ${filePath}
총 크기: ${stats.size} bytes (${Math.round(stats.size/1024)}KB)
총 라인: ${totalLines}

📊 ${chunkNumber + 1}/${totalChunks} 청크 (${linesPerChunk}줄씩 분할)
라인 범위: ${startLine + 1}-${endLine + 1} (이 청크 크기: ${chunkSizeKB}KB)

🤖 지능형 파일 읽기 - 큰 파일 자동 청킹
200줄 이상 파일이므로 안전한 청크 단위로 제공합니다.

=== ${chunkNumber + 1}/${totalChunks} 청크 시작 (라인 ${startLine + 1}-${endLine + 1}) ===
${chunkContent}
=== ${chunkNumber + 1}/${totalChunks} 청크 완료 ===

${chunkNumber + 1 < totalChunks ? 
`⚠️  아직 ${totalChunks - (chunkNumber + 1)}개 청크가 더 남았습니다!
🔄 다음 청크 읽기: read_file_smart("${filePath}", ${chunkNumber + 1})
📋 남은 청크: ${chunkNumber + 2}/${totalChunks}, ${chunkNumber + 3}/${totalChunks}${totalChunks > chunkNumber + 3 ? ', ...' : ''}` : 
'🎉 모든 청크를 완전히 읽었습니다! 파일 분석 완료.'}`
          }
        ]
      };
      
    } catch (error) {
      throw new Error(`지능형 파일 읽기 실패: ${filePath} - ${error.message}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('FullContextInput MCP 서버가 시작되었습니다.');
  }
}

const server = new FullContextInputMCPServer();
server.run().catch(console.error);
