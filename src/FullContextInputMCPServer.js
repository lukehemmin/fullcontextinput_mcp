#!/usr/bin/env node

import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// 핵심 모듈
import { BaseServer } from './core/BaseServer.js';

// 핸들러 모듈들
import { FileHandler } from './handlers/FileHandler.js';
import { DirectoryHandler } from './handlers/DirectoryHandler.js';
import { AnalysisHandler } from './handlers/AnalysisHandler.js';
import { WriteHandler } from './handlers/WriteHandler.js';
import { SafetyHandler } from './handlers/SafetyHandler.js';

// 도구 정의
import { ToolDefinitions } from './tools/ToolDefinitions.js';
import { SafetyTools } from './tools/SafetyTools.js';

/**
 * FullContextInput MCP 서버 메인 클래스
 * 모든 기능을 통합하고 MCP 프로토콜을 처리
 */
export class FullContextInputMCPServer {
  constructor() {
    // 베이스 서버 초기화
    this.baseServer = new BaseServer('fullcontextinput_mcp', '1.2.0');
    
    // 핸들러 초기화
    this.fileHandler = new FileHandler(this.baseServer);
    this.directoryHandler = new DirectoryHandler(this.baseServer);
    this.analysisHandler = new AnalysisHandler(this.baseServer);
    this.writeHandler = new WriteHandler(this.baseServer);
    this.safetyHandler = new SafetyHandler(this.baseServer);

    // 서버 설정
    this.setupHandlers();
  }

  /**
   * MCP 핸들러 설정
   */
  setupHandlers() {
    // 도구 목록 요청 처리
    this.baseServer.getServer().setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          ...ToolDefinitions.getAllTools(),
          ...SafetyTools.getAllSafetyTools()
        ]
      };
    });

    // 도구 실행 요청 처리
    this.baseServer.getServer().setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // 분석 관련 도구들
          case 'extract_file_content':
            return await this.analysisHandler.extractFileContent(args.prompt, args.workspace_path || '.');
          
          case 'analyze_prompt_for_files':
            return await this.analysisHandler.analyzePromptForFiles(args.user_prompt, args.workspace_path || process.cwd());

          // 파일 읽기 관련 도구들
          case 'read_file_content':
            return await this.fileHandler.readFileContent(args.file_path);
          
          case 'get_file_info':
            return await this.fileHandler.getFileInfo(args.file_path);
          
          case 'read_file_chunk':
            return await this.fileHandler.readFileChunk(
              args.file_path,
              args.lines_per_chunk || 200,
              args.chunk_number || 0
            );
          
          case 'read_file_lines':
            return await this.fileHandler.readFileLines(
              args.file_path,
              args.start_line || 1,
              args.end_line,
              args.max_lines || 100
            );
          
          case 'read_file_smart':
            return await this.fileHandler.readFileSmart(
              args.file_path,
              args.chunk_number || 0,
              args.lines_per_chunk || 200
            );

          // 디렉토리 관련 도구들
          case 'read_directory_structure':
            return await this.directoryHandler.readDirectoryStructure(
              args.directory_path,
              args.max_depth || 10,
              args.include_extensions
            );
          
          case 'read_directory_context':
            return await this.directoryHandler.readDirectoryContext(
              args.directory_path, 
              args.max_depth || 10, 
              args.include_extensions,
              args.max_files || 50,
              args.max_file_size || 51200,
              args.max_total_size || 512000,
              args.prioritize_important !== false
            );

          // 파일 찾기
          case 'find_files':
            return await this.analysisHandler.findFiles(args.pattern, args.workspace_path);

          // 파일 쓰기 관련 도구들
          case 'write_file_complete':
            return await this.writeHandler.writeFileComplete(
              args.file_path,
              args.content,
              args.encoding || 'utf8'
            );
          
          case 'write_file_diff':
            return await this.writeHandler.writeFileDiff(
              args.file_path,
              args.start_line,
              args.end_line,
              args.new_content,
              args.backup !== false
            );

          // AI 안전 도구들
          case 'create_safety_backup':
            return await this.safetyHandler.createSafetyBackup(
              args.file_path,
              args.reason
            );
            
          case 'restore_from_backup':
            return await this.safetyHandler.restoreFromBackup(
              args.file_path,
              args.backup_path
            );
            
          case 'analyze_code_changes':
            return await this.safetyHandler.analyzeCodeChanges(
              args.original_content,
              args.new_content,
              args.file_path
            );
            
          case 'validate_code_integrity':
            return await this.safetyHandler.validateCodeIntegrity(
              args.code_content,
              args.file_path,
              args.check_completeness
            );
            
          case 'suggest_safe_edit_strategy':
            return await this.safetyHandler.suggestSafeEditStrategy(
              args.file_path,
              args.edit_intention,
              args.target_lines
            );
            
          case 'get_ai_safety_guidelines':
            return await this.safetyHandler.getAISafetyGuidelines(
              args.operation_type,
              args.file_path,
              args.complexity_level
            );
            
          case 'check_prerequisites':
            return await this.safetyHandler.checkPrerequisites(
              args.file_path,
              args.understanding_summary,
              args.proposed_changes
            );
          
          default:
            throw new Error(`알 수 없는 도구: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ 오류: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });

    // 리소스 관련 핸들러 (필요시 확장 가능)
    this.baseServer.getServer().setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: []
      };
    });

    this.baseServer.getServer().setRequestHandler(ReadResourceRequestSchema, async (request) => {
      throw new Error(`리소스를 찾을 수 없습니다: ${request.params.uri}`);
    });
  }

  /**
   * 서버 시작
   */
  async run() {
    await this.baseServer.run();
  }

  /**
   * 베이스 서버 반환 (테스트 용도)
   */
  getBaseServer() {
    return this.baseServer;
  }

  /**
   * 각 핸들러 반환 (테스트 용도)
   */
  getHandlers() {
    return {
      file: this.fileHandler,
      directory: this.directoryHandler,
      analysis: this.analysisHandler,
      write: this.writeHandler
    };
  }
}
