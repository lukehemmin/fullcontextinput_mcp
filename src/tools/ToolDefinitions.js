/**
 * MCP 도구 스키마 정의
 */
export class ToolDefinitions {
  /**
   * 모든 MCP 도구들의 스키마 정의 반환
   */
  static getAllTools() {
    return [
      // 파일 관련 도구들
      ToolDefinitions.getReadFileContentTool(),
      ToolDefinitions.getGetFileInfoTool(),
      ToolDefinitions.getReadFileChunkTool(),
      ToolDefinitions.getReadFileLinesTool(),
      ToolDefinitions.getReadFileSmartTool(),

      // 디렉토리 관련 도구들
      ToolDefinitions.getReadDirectoryStructureTool(),
      ToolDefinitions.getReadDirectoryContextTool(),

      // 분석 관련 도구들
      ToolDefinitions.getAnalyzePromptForFilesTool(),
      ToolDefinitions.getExtractFileContentTool(),
      ToolDefinitions.getFindFilesTool(),

      // 쓰기 관련 도구들
      ToolDefinitions.getWriteFileCompleteTool(),
      ToolDefinitions.getWriteFileDiffTool()
    ];
  }

  /**
   * 파일 내용 읽기 도구
   */
  static getReadFileContentTool() {
    return {
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
    };
  }

  /**
   * 파일 정보 조회 도구
   */
  static getGetFileInfoTool() {
    return {
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
    };
  }

  /**
   * 파일 청크 읽기 도구
   */
  static getReadFileChunkTool() {
    return {
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
    };
  }

  /**
   * 파일 라인 범위 읽기 도구
   */
  static getReadFileLinesTool() {
    return {
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
    };
  }

  /**
   * 스마트 파일 읽기 도구
   */
  static getReadFileSmartTool() {
    return {
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
    };
  }

  /**
   * 디렉토리 구조 읽기 도구
   */
  static getReadDirectoryStructureTool() {
    return {
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
    };
  }

  /**
   * 디렉토리 컨텍스트 읽기 도구
   */
  static getReadDirectoryContextTool() {
    return {
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
    };
  }

  /**
   * 프롬프트 분석 도구
   */
  static getAnalyzePromptForFilesTool() {
    return {
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
    };
  }

  /**
   * 파일 내용 추출 도구
   */
  static getExtractFileContentTool() {
    return {
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
    };
  }

  /**
   * 파일 찾기 도구
   */
  static getFindFilesTool() {
    return {
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
    };
  }

  /**
   * 파일 전체 작성 도구
   */
  static getWriteFileCompleteTool() {
    return {
      name: 'write_file_complete',
      description: '짧은 코드(5000-6000토큰 미만)를 파일에 완전히 작성합니다. 파일이 없으면 생성하고, 있으면 덮어씁니다.',
      inputSchema: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: '작성할 파일의 경로'
          },
          content: {
            type: 'string',
            description: '파일에 작성할 전체 코드 내용'
          },
          encoding: {
            type: 'string',
            description: '파일 인코딩 (기본값: utf8)',
            default: 'utf8'
          }
        },
        required: ['file_path', 'content']
      }
    };
  }

  /**
   * 파일 Diff 수정 도구
   */
  static getWriteFileDiffTool() {
    return {
      name: 'write_file_diff',
      description: '긴 코드(6000토큰 초과)를 diff 방식으로 수정합니다. 기존 파일을 읽고 지정된 라인 범위를 새로운 내용으로 교체합니다.',
      inputSchema: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: '수정할 파일의 경로'
          },
          start_line: {
            type: 'integer',
            description: '교체할 시작 라인 번호 (1부터 시작)'
          },
          end_line: {
            type: 'integer',
            description: '교체할 끝 라인 번호 (inclusive)'
          },
          new_content: {
            type: 'string',
            description: '교체할 새로운 코드 내용'
          },
          backup: {
            type: 'boolean',
            description: '백업 파일 생성 여부 (기본값: true)',
            default: true
          }
        },
        required: ['file_path', 'start_line', 'end_line', 'new_content']
      }
    };
  }
}
