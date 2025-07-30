/**
 * AI 코딩 안전을 위한 추가 도구들
 */
export class SafetyTools {
  /**
   * 파일 백업 및 복원 도구 정의
   */
  static getBackupTools() {
    return [
      {
        name: 'create_safety_backup',
        description: 'AI 코드 수정 전 안전 백업을 생성합니다. 타임스탬프와 함께 백업 폴더에 저장됩니다.',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: '백업할 파일의 경로'
            },
            reason: {
              type: 'string', 
              description: '백업 생성 이유',
              default: 'AI 코드 수정 전 안전 백업'
            }
          },
          required: ['file_path']
        }
      },
      {
        name: 'restore_from_backup',
        description: '백업에서 파일을 복원합니다. 실수로 코드가 손상된 경우 사용하세요.',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: '복원할 원본 파일 경로'
            },
            backup_path: {
              type: 'string',
              description: '복원할 백업 파일 경로 (선택사항)'
            }
          },
          required: ['file_path']
        }
      }
    ];
  }

  /**
   * 코드 분석 및 비교 도구 정의
   */
  static getAnalysisTools() {
    return [
      {
        name: 'analyze_code_changes',
        description: '두 코드 버전을 비교하여 변경사항을 분석합니다. 기능 유실, 구조 변화 등을 감지합니다.',
        inputSchema: {
          type: 'object',
          properties: {
            original_content: {
              type: 'string',
              description: '원본 코드 내용'
            },
            new_content: {
              type: 'string',
              description: '새로운 코드 내용'
            },
            file_path: {
              type: 'string',
              description: '분석할 파일 경로 (컨텍스트 제공용)'
            }
          },
          required: ['original_content', 'new_content']
        }
      },
      {
        name: 'validate_code_integrity',
        description: '코드의 무결성을 검증합니다. 문법 오류, 불완전한 구조, 누락된 기능을 감지합니다.',
        inputSchema: {
          type: 'object',
          properties: {
            code_content: {
              type: 'string',
              description: '검증할 코드 내용'
            },
            file_path: {
              type: 'string',
              description: '파일 경로 (언어 감지용)'
            },
            check_completeness: {
              type: 'boolean',
              description: '완성도 검사 여부',
              default: true
            }
          },
          required: ['code_content', 'file_path']
        }
      },
      {
        name: 'suggest_safe_edit_strategy',
        description: 'AI가 안전하게 코드를 수정할 수 있는 전략을 제안합니다. 파일 크기와 복잡도에 따라 최적의 접근 방법을 안내합니다.',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: '수정할 파일 경로'
            },
            edit_intention: {
              type: 'string',
              description: '수정 의도 설명'
            },
            target_lines: {
              type: 'string',
              description: '수정하려는 대략적인 라인 범위 (선택사항)'
            }
          },
          required: ['file_path', 'edit_intention']
        }
      }
    ];
  }

  /**
   * AI 가이던스 도구 정의
   */
  static getGuidanceTools() {
    return [
      {
        name: 'get_ai_safety_guidelines',
        description: 'AI 코드 수정을 위한 안전 가이드라인을 제공합니다. 작업 유형에 맞는 체크리스트와 주의사항을 안내합니다.',
        inputSchema: {
          type: 'object',
          properties: {
            operation_type: {
              type: 'string',
              enum: ['complete_rewrite', 'diff_edit', 'function_add', 'bug_fix', 'refactor'],
              description: '수행할 작업 유형'
            },
            file_path: {
              type: 'string', 
              description: '대상 파일 경로'
            },
            complexity_level: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: '코드 복잡도 수준',
              default: 'medium'
            }
          },
          required: ['operation_type']
        }
      },
      {
        name: 'check_prerequisites',
        description: 'AI 코드 수정 전 필수 조건들을 확인합니다. 원본 파일 이해도, 백업 상태 등을 점검합니다.',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: '수정할 파일 경로'
            },
            understanding_summary: {
              type: 'string',
              description: 'AI가 파악한 원본 코드 이해 요약'
            },
            proposed_changes: {
              type: 'string',
              description: '제안하는 변경사항 설명'
            }
          },
          required: ['file_path', 'understanding_summary', 'proposed_changes']
        }
      }
    ];
  }

  /**
   * 모든 안전 도구 반환
   */
  static getAllSafetyTools() {
    return [
      ...SafetyTools.getBackupTools(),
      ...SafetyTools.getAnalysisTools(), 
      ...SafetyTools.getGuidanceTools()
    ];
  }

  /**
   * 특정 상황에 맞는 도구 추천
   */
  static recommendTools(situation) {
    const recommendations = {
      'before_major_edit': [
        'create_safety_backup',
        'get_ai_safety_guidelines',
        'check_prerequisites'
      ],
      'after_code_generation': [
        'validate_code_integrity', 
        'analyze_code_changes'
      ],
      'when_unsure': [
        'suggest_safe_edit_strategy',
        'get_ai_safety_guidelines'
      ],
      'emergency_restore': [
        'restore_from_backup'
      ]
    };

    return recommendations[situation] || [];
  }

  /**
   * 안전도 수준 평가
   */
  static assessSafetyLevel(fileSize, complexity, hasBackup, aiConfidence) {
    let score = 10;
    
    // 파일 크기에 따른 위험도
    if (fileSize > 100000) score -= 3; // 100KB 초과
    else if (fileSize > 50000) score -= 2; // 50KB 초과
    else if (fileSize > 20000) score -= 1; // 20KB 초과
    
    // 복잡도에 따른 위험도
    if (complexity === 'high') score -= 3;
    else if (complexity === 'medium') score -= 1;
    
    // 백업 상태
    if (!hasBackup) score -= 2;
    
    // AI 신뢰도
    if (aiConfidence < 0.7) score -= 2;
    else if (aiConfidence < 0.8) score -= 1;
    
    return Math.max(0, Math.min(10, score));
  }

  /**
   * 위험 신호 감지
   */
  static detectRiskSignals(originalCode, newCode) {
    const signals = [];
    
    if (!originalCode || !newCode) {
      signals.push({
        level: 'high',
        message: '원본 또는 새 코드가 없습니다'
      });
      return signals;
    }
    
    const originalLines = originalCode.split('\n').length;
    const newLines = newCode.split('\n').length;
    const sizeDiff = Math.abs(newLines - originalLines) / originalLines;
    
    // 크기 급변 감지
    if (sizeDiff > 0.5) {
      signals.push({
        level: 'high',
        message: `파일 크기 급변: ${originalLines} → ${newLines}줄 (${Math.round(sizeDiff * 100)}%)`
      });
    }
    
    // 함수 유실 감지
    const originalFunctions = (originalCode.match(/function\s+\w+/g) || []).length;
    const newFunctions = (newCode.match(/function\s+\w+/g) || []).length;
    
    if (newFunctions < originalFunctions * 0.8) {
      signals.push({
        level: 'high',
        message: `함수 감소 감지: ${originalFunctions} → ${newFunctions}개`
      });
    }
    
    // 불완전한 코드 감지
    if (newCode.includes('...') || newCode.includes('<truncated>')) {
      signals.push({
        level: 'critical',
        message: '코드가 잘린 것으로 보입니다'
      });
    }
    
    // Import/Export 변화 감지
    const originalImports = (originalCode.match(/import\s+/g) || []).length;
    const newImports = (newCode.match(/import\s+/g) || []).length;
    
    if (newImports < originalImports * 0.8) {
      signals.push({
        level: 'medium',
        message: `Import 구문 감소: ${originalImports} → ${newImports}개`
      });
    }
    
    return signals;
  }
}
