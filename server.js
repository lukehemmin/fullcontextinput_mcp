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
      version: '1.0.2',
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
          
          case 'analyze_prompt_for_files':
            return await this.analyzePromptForFiles(args.user_prompt, args.workspace_path || process.cwd());
          
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

  // 파일 내용 읽기 (Rate Limiting 적용)
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
      const content = fs.readFileSync(filePath, 'utf8');
      const stats = fs.statSync(filePath);
      
      const result = {
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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('FullContextInput MCP 서버가 시작되었습니다.');
  }
}

const server = new FullContextInputMCPServer();
server.run().catch(console.error);
