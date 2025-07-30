import fs from 'fs';
import path from 'path';
import { CodeValidator } from '../core/CodeValidator.js';
import { FileUtils } from '../core/FileUtils.js';

/**
 * AI 코딩 안전을 위한 핸들러
 */
export class SafetyHandler {
  constructor(baseServer) {
    this.baseServer = baseServer;
    this.backupDir = path.join(process.cwd(), 'fullcontextmcp_backup');
    this.ensureBackupDir();
  }

  /**
   * 백업 디렉토리 생성 보장 및 .gitignore 자동 등록
   */
  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      // 백업 디렉토리 생성
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log(`📁 백업 폴더 생성: ${this.backupDir}`);
      
      // .gitignore에 자동 추가
      this.ensureGitIgnore();
    }
  }

  /**
   * .gitignore에 백업 폴더 자동 등록
   */
  ensureGitIgnore() {
    const gitIgnorePath = path.join(process.cwd(), '.gitignore');
    const backupFolderName = path.basename(this.backupDir) + '/';
    
    try {
      let gitIgnoreContent = '';
      
      // 기존 .gitignore 읽기 (없으면 빈 문자열)
      if (fs.existsSync(gitIgnorePath)) {
        gitIgnoreContent = fs.readFileSync(gitIgnorePath, 'utf8');
      }
      
      // 이미 백업 폴더가 등록되어 있는지 확인
      const lines = gitIgnoreContent.split('\n');
      const alreadyExists = lines.some(line => 
        line.trim() === backupFolderName || 
        line.trim() === backupFolderName.slice(0, -1) // 슬래시 없는 버전도 체크
      );
      
      if (!alreadyExists) {
        // .gitignore에 백업 폴더 추가
        const newContent = gitIgnoreContent.trim() + 
          (gitIgnoreContent.trim() ? '\n' : '') + 
          backupFolderName + '\n';
        
        fs.writeFileSync(gitIgnorePath, newContent);
        console.log(`📝 .gitignore에 백업 폴더 추가: ${backupFolderName}`);
      }
      
    } catch (error) {
      console.warn(`⚠️  .gitignore 업데이트 실패: ${error.message}`);
      // .gitignore 업데이트 실패해도 백업 기능은 계속 작동
    }
  }

  /**
   * 안전 백업 생성
   */
  async createSafetyBackup(filePath, reason = 'AI 코드 수정 전 안전 백업') {
    try {
      await this.baseServer.checkRateLimit('createSafetyBackup');
      
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: `파일을 찾을 수 없습니다: ${filePath}`,
          backupPath: null
        };
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = path.basename(filePath);
      const backupFileName = `${fileName}.${timestamp}.backup`;
      const backupPath = path.join(this.backupDir, backupFileName);

      // 백업 생성
      const content = fs.readFileSync(filePath, 'utf8');
      fs.writeFileSync(backupPath, content);

      // 메타데이터 저장
      const metadata = {
        originalPath: filePath,
        backupPath: backupPath,
        timestamp: new Date().toISOString(),
        reason: reason,
        originalSize: content.length,
        originalLines: content.split('\n').length
      };

      const metadataPath = backupPath + '.meta';
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      return {
        success: true,
        message: `✅ 안전 백업 생성 완료: ${fileName}`,
        backupPath: backupPath,
        metadata: metadata,
        details: {
          originalSize: `${Math.round(content.length / 1024 * 100) / 100}KB`,
          originalLines: metadata.originalLines,
          backupLocation: this.backupDir
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `백업 생성 실패: ${error.message}`,
        backupPath: null
      };
    }
  }

  /**
   * 백업에서 복원
   */
  async restoreFromBackup(filePath, backupPath = null) {
    try {
      await this.baseServer.checkRateLimit('restoreFromBackup');

      // 백업 파일 찾기
      if (!backupPath) {
        const fileName = path.basename(filePath);
        const backupFiles = fs.readdirSync(this.backupDir)
          .filter(file => file.startsWith(fileName) && file.endsWith('.backup'))
          .sort().reverse(); // 최신 백업 우선

        if (backupFiles.length === 0) {
          return {
            success: false,
            error: `${fileName}의 백업을 찾을 수 없습니다`,
            availableBackups: []
          };
        }

        backupPath = path.join(this.backupDir, backupFiles[0]);
      }

      if (!fs.existsSync(backupPath)) {
        return {
          success: false,
          error: `백업 파일을 찾을 수 없습니다: ${backupPath}`,
          availableBackups: this.listBackups(filePath)
        };
      }

      // 메타데이터 읽기
      const metadataPath = backupPath + '.meta';
      let metadata = {};
      if (fs.existsSync(metadataPath)) {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      }

      // 현재 파일 백업 (복원 전)
      const preRestoreBackup = await this.createSafetyBackup(filePath, '복원 전 현재 상태');

      // 백업에서 복원
      const backupContent = fs.readFileSync(backupPath, 'utf8');
      fs.writeFileSync(filePath, backupContent);

      // 캐시 무효화
      this.baseServer.invalidateCache(filePath);

      return {
        success: true,
        message: `✅ 백업에서 성공적으로 복원: ${path.basename(filePath)}`,
        restoredFrom: backupPath,
        metadata: metadata,
        preRestoreBackup: preRestoreBackup.backupPath,
        details: {
          restoredSize: `${Math.round(backupContent.length / 1024 * 100) / 100}KB`,
          restoredLines: backupContent.split('\n').length,
          backupTimestamp: metadata.timestamp
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `복원 실패: ${error.message}`,
        availableBackups: this.listBackups(filePath)
      };
    }
  }

  /**
   * 코드 변경사항 분석
   */
  async analyzeCodeChanges(originalContent, newContent, filePath = '') {
    try {
      await this.baseServer.checkRateLimit('analyzeCodeChanges');

      const analysis = {
        summary: {},
        changes: {},
        risks: [],
        recommendations: []
      };

      // 기본 통계
      const originalLines = originalContent.split('\n');
      const newLines = newContent.split('\n');
      
      analysis.summary = {
        originalLines: originalLines.length,
        newLines: newLines.length,
        lineDiff: newLines.length - originalLines.length,
        originalSize: originalContent.length,
        newSize: newContent.length,
        sizeDiff: newContent.length - originalContent.length,
        changeRatio: Math.abs(newContent.length - originalContent.length) / originalContent.length
      };

      // 구조적 변화 분석
      analysis.changes = this.analyzeStructuralChanges(originalContent, newContent);

      // 위험 신호 감지
      analysis.risks = this.detectRisks(originalContent, newContent);

      // 추천사항 생성
      analysis.recommendations = this.generateRecommendations(analysis);

      return {
        success: true,
        filePath: filePath,
        analysis: analysis,
        message: this.formatAnalysisMessage(analysis)
      };

    } catch (error) {
      return {
        success: false,
        error: `코드 분석 실패: ${error.message}`
      };
    }
  }

  /**
   * 코드 무결성 검증
   */
  async validateCodeIntegrity(codeContent, filePath, checkCompleteness = true) {
    try {
      await this.baseServer.checkRateLimit('validateCodeIntegrity');

      const validation = CodeValidator.validateCode(codeContent, filePath);
      
      return {
        success: true,
        validation: validation,
        message: this.formatValidationMessage(validation),
        recommendations: validation.suggestions || []
      };

    } catch (error) {
      return {
        success: false,
        error: `코드 검증 실패: ${error.message}`
      };
    }
  }

  /**
   * 안전한 편집 전략 제안
   */
  async suggestSafeEditStrategy(filePath, editIntention, targetLines = '') {
    try {
      await this.baseServer.checkRateLimit('suggestSafeEditStrategy');

      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: `파일을 찾을 수 없습니다: ${filePath}`
        };
      }

      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').length;
      
      const strategy = this.determineStrategy(stats.size, lines, editIntention, targetLines);

      return {
        success: true,
        strategy: strategy,
        message: this.formatStrategyMessage(strategy),
        checklist: this.generateChecklist(strategy)
      };

    } catch (error) {
      return {
        success: false,
        error: `전략 제안 실패: ${error.message}`
      };
    }
  }

  /**
   * AI 안전 가이드라인 제공
   */
  async getAISafetyGuidelines(operationType, filePath = '', complexityLevel = 'medium') {
    try {
      await this.baseServer.checkRateLimit('getAISafetyGuidelines');

      const guidelines = {
        operationType: operationType,
        complexityLevel: complexityLevel,
        guidelines: this.getGuidelinesForOperation(operationType),
        checklist: this.getChecklistForOperation(operationType),
        warnings: this.getWarningsForOperation(operationType, complexityLevel),
        tools: this.getRecommendedTools(operationType)
      };

      return {
        success: true,
        guidelines: guidelines,
        message: this.formatGuidelinesMessage(guidelines)
      };

    } catch (error) {
      return {
        success: false,
        error: `가이드라인 제공 실패: ${error.message}`
      };
    }
  }

  /**
   * 전제조건 확인
   */
  async checkPrerequisites(filePath, understandingSummary, proposedChanges) {
    try {
      await this.baseServer.checkRateLimit('checkPrerequisites');

      const checks = {
        fileExists: fs.existsSync(filePath),
        hasBackup: this.hasRecentBackup(filePath),
        understandingQuality: this.assessUnderstanding(understandingSummary),
        changeClarity: this.assessChangeClarity(proposedChanges),
        overall: 'pending'
      };

      // 전체 평가
      const passedChecks = Object.values(checks).filter(check => 
        check === true || (typeof check === 'object' && check.passed)
      ).length;
      
      checks.overall = passedChecks >= 3 ? 'passed' : 'failed';

      return {
        success: true,
        checks: checks,
        message: this.formatPrerequisitesMessage(checks),
        recommendations: this.getPrerequisiteRecommendations(checks)
      };

    } catch (error) {
      return {
        success: false,
        error: `전제조건 확인 실패: ${error.message}`
      };
    }
  }

  // === 유틸리티 메서드들 ===

  /**
   * 백업 목록 조회
   */
  listBackups(filePath) {
    try {
      const fileName = path.basename(filePath);
      return fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith(fileName) && file.endsWith('.backup'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          created: fs.statSync(path.join(this.backupDir, file)).mtime
        }))
        .sort((a, b) => b.created - a.created);
    } catch (error) {
      return [];
    }
  }

  /**
   * 최근 백업 존재 확인
   */
  hasRecentBackup(filePath, hoursThreshold = 1) {
    const backups = this.listBackups(filePath);
    if (backups.length === 0) return false;
    
    const latestBackup = backups[0];
    const hoursSince = (Date.now() - latestBackup.created.getTime()) / (1000 * 60 * 60);
    
    return hoursSince <= hoursThreshold;
  }

  /**
   * 구조적 변화 분석
   */
  analyzeStructuralChanges(original, updated) {
    const changes = {};
    
    // 함수 분석
    const originalFunctions = this.extractFunctions(original);
    const newFunctions = this.extractFunctions(updated);
    
    changes.functions = {
      added: newFunctions.filter(f => !originalFunctions.includes(f)),
      removed: originalFunctions.filter(f => !newFunctions.includes(f)),
      total: { original: originalFunctions.length, new: newFunctions.length }
    };

    // 클래스 분석
    const originalClasses = this.extractClasses(original);
    const newClasses = this.extractClasses(updated);
    
    changes.classes = {
      added: newClasses.filter(c => !originalClasses.includes(c)),
      removed: originalClasses.filter(c => !newClasses.includes(c)),
      total: { original: originalClasses.length, new: newClasses.length }
    };

    // Import/Export 분석
    changes.imports = {
      original: (original.match(/import\s+/g) || []).length,
      new: (updated.match(/import\s+/g) || []).length
    };

    return changes;
  }

  /**
   * 위험 신호 감지
   */
  detectRisks(original, updated) {
    const risks = [];
    
    // 대량 삭제 감지
    const sizeRatio = updated.length / original.length;
    if (sizeRatio < 0.7) {
      risks.push({
        level: 'high',
        type: 'mass_deletion',
        message: `코드 크기가 ${Math.round((1 - sizeRatio) * 100)}% 감소했습니다`
      });
    }

    // 코드 잘림 감지
    if (updated.includes('...') || updated.includes('[truncated]')) {
      risks.push({
        level: 'critical',
        type: 'truncated_code',
        message: '코드가 잘린 것으로 보입니다'
      });
    }

    // 구문 오류 가능성
    const brackets = { '{': 0, '}': 0, '(': 0, ')': 0, '[': 0, ']': 0 };
    for (const char of updated) {
      if (brackets.hasOwnProperty(char)) {
        brackets[char]++;
      }
    }
    
    if (brackets['{'] !== brackets['}'] || 
        brackets['('] !== brackets[')'] || 
        brackets['['] !== brackets[']']) {
      risks.push({
        level: 'high',
        type: 'syntax_error',
        message: '괄호 짝이 맞지 않습니다'
      });
    }

    return risks;
  }

  /**
   * 함수 추출
   */
  extractFunctions(code) {
    const functionRegex = /(?:function\s+(\w+)|(\w+)\s*:\s*function|(\w+)\s*=>\s*{|const\s+(\w+)\s*=\s*function)/g;
    const functions = [];
    let match;
    
    while ((match = functionRegex.exec(code)) !== null) {
      functions.push(match[1] || match[2] || match[3] || match[4]);
    }
    
    return functions;
  }

  /**
   * 클래스 추출
   */
  extractClasses(code) {
    const classRegex = /class\s+(\w+)/g;
    const classes = [];
    let match;
    
    while ((match = classRegex.exec(code)) !== null) {
      classes.push(match[1]);
    }
    
    return classes;
  }

  /**
   * 전략 결정
   */
  determineStrategy(fileSize, lines, intention, targetLines) {
    const strategy = {
      recommended: '',
      reasoning: '',
      precautions: [],
      steps: []
    };

    if (lines < 100) {
      strategy.recommended = 'complete_rewrite';
      strategy.reasoning = '파일이 작아 전체 교체가 안전합니다';
      strategy.steps = [
        '1. 원본 파일 완전히 읽기',
        '2. 모든 기능 이해 후 새 코드 작성',
        '3. write_file_complete 사용'
      ];
    } else if (targetLines && intention.includes('specific')) {
      strategy.recommended = 'diff_edit';
      strategy.reasoning = '특정 부분만 수정하므로 diff 방식이 적합합니다';
      strategy.steps = [
        '1. 정확한 라인 범위 확인',
        '2. 주변 코드와의 호환성 확인',
        '3. write_file_diff 사용'
      ];
    } else {
      strategy.recommended = 'chunked_approach';
      strategy.reasoning = '큰 파일이므로 단계적 접근이 필요합니다';
      strategy.steps = [
        '1. 파일을 논리적 블록으로 나누기',
        '2. 각 블록을 개별적으로 수정',
        '3. 각 단계마다 검증'
      ];
    }

    return strategy;
  }

  // === 메시지 포맷팅 메서드들 ===

  formatAnalysisMessage(analysis) {
    const { summary, changes, risks } = analysis;
    
    let message = `📊 코드 변경 분석 결과:\n\n`;
    message += `📏 크기 변화: ${summary.originalLines} → ${summary.newLines}줄 (${summary.lineDiff >= 0 ? '+' : ''}${summary.lineDiff})\n`;
    message += `💾 용량 변화: ${Math.round(summary.originalSize/1024)}KB → ${Math.round(summary.newSize/1024)}KB\n\n`;
    
    if (changes.functions) {
      message += `🔧 함수 변화: ${changes.functions.total.original} → ${changes.functions.total.new}개\n`;
      if (changes.functions.removed.length > 0) {
        message += `❌ 제거된 함수: ${changes.functions.removed.join(', ')}\n`;
      }
      if (changes.functions.added.length > 0) {
        message += `✅ 추가된 함수: ${changes.functions.added.join(', ')}\n`;
      }
    }
    
    if (risks.length > 0) {
      message += `\n⚠️ 위험 신호:\n`;
      risks.forEach(risk => {
        const icon = risk.level === 'critical' ? '🔴' : risk.level === 'high' ? '🟠' : '🟡';
        message += `${icon} ${risk.message}\n`;
      });
    }
    
    return message;
  }

  formatValidationMessage(validation) {
    let message = `🔍 코드 무결성 검증 결과:\n\n`;
    
    if (validation.isValid) {
      message += `✅ 코드가 유효합니다\n`;
    } else {
      message += `❌ 코드에 문제가 발견되었습니다:\n`;
      validation.errors?.forEach(error => {
        message += `  - ${error}\n`;
      });
    }
    
    if (validation.warnings?.length > 0) {
      message += `\n⚠️ 경고사항:\n`;
      validation.warnings.forEach(warning => {
        message += `  - ${warning}\n`;
      });
    }
    
    return message;
  }

  formatStrategyMessage(strategy) {
    let message = `🎯 추천 편집 전략: ${strategy.recommended}\n\n`;
    message += `💡 이유: ${strategy.reasoning}\n\n`;
    message += `📋 실행 단계:\n`;
    strategy.steps.forEach((step, index) => {
      message += `${step}\n`;
    });
    
    return message;
  }

  formatGuidelinesMessage(guidelines) {
    let message = `🛡️ AI 안전 가이드라인 (${guidelines.operationType})\n\n`;
    
    message += `📋 체크리스트:\n`;
    guidelines.checklist?.forEach(item => {
      message += `☐ ${item}\n`;
    });
    
    if (guidelines.warnings?.length > 0) {
      message += `\n⚠️ 주의사항:\n`;
      guidelines.warnings.forEach(warning => {
        message += `- ${warning}\n`;
      });
    }
    
    return message;
  }

  formatPrerequisitesMessage(checks) {
    let message = `✅ 전제조건 확인 결과:\n\n`;
    
    message += `📁 파일 존재: ${checks.fileExists ? '✅' : '❌'}\n`;
    message += `💾 백업 상태: ${checks.hasBackup ? '✅' : '❌'}\n`;
    message += `🧠 이해도: ${checks.understandingQuality.level}\n`;
    message += `📝 변경 명확성: ${checks.changeClarity.level}\n`;
    message += `🎯 전체 평가: ${checks.overall === 'passed' ? '✅ 통과' : '❌ 미흡'}\n`;
    
    return message;
  }

  // === 추가 헬퍼 메서드들 ===

  getGuidelinesForOperation(operationType) {
    const guidelines = {
      complete_rewrite: [
        '원본 파일을 완전히 읽고 모든 기능을 파악하세요',
        '새 코드에 모든 기능이 포함되었는지 확인하세요',
        'Import/Export 구문을 누락하지 마세요'
      ],
      diff_edit: [
        '정확한 라인 범위를 확인하세요',
        '주변 코드와의 맥락을 고려하세요',
        '들여쓰기를 일치시키세요'
      ],
      // ... 다른 타입들
    };
    
    return guidelines[operationType] || [];
  }

  getChecklistForOperation(operationType) {
    const checklists = {
      complete_rewrite: [
        '모든 함수가 포함되었는가?',
        '모든 변수가 포함되었는가?',
        'Import 구문이 완전한가?',
        '코드가 중간에 잘리지 않았는가?'
      ],
      diff_edit: [
        '라인 번호가 정확한가?',
        '들여쓰기가 일치하는가?',
        '함수 경계를 넘나들지 않는가?',
        '주변 코드와 호환되는가?'
      ],
      // ... 다른 타입들
    };
    
    return checklists[operationType] || [];
  }

  getWarningsForOperation(operationType, complexityLevel) {
    const warnings = [];
    
    if (complexityLevel === 'high') {
      warnings.push('높은 복잡도 코드는 더 신중하게 접근하세요');
      warnings.push('가능한 한 작은 단위로 나누어 수정하세요');
    }
    
    return warnings;
  }

  getRecommendedTools(operationType) {
    const tools = {
      complete_rewrite: ['create_safety_backup', 'validate_code_integrity'],
      diff_edit: ['analyze_code_changes', 'validate_code_integrity'],
      // ... 다른 타입들
    };
    
    return tools[operationType] || [];
  }

  assessUnderstanding(summary) {
    // 간단한 이해도 평가 로직
    const wordCount = summary.split(' ').length;
    const hasKeywords = ['function', 'class', 'method', 'variable'].some(keyword => 
      summary.toLowerCase().includes(keyword)
    );
    
    if (wordCount > 50 && hasKeywords) {
      return { level: 'high', passed: true };
    } else if (wordCount > 20) {
      return { level: 'medium', passed: true };
    } else {
      return { level: 'low', passed: false };
    }
  }

  assessChangeClarity(changes) {
    // 변경사항 명확성 평가
    const wordCount = changes.split(' ').length;
    const hasSpecifics = ['add', 'remove', 'modify', 'fix', 'update'].some(keyword => 
      changes.toLowerCase().includes(keyword)
    );
    
    if (wordCount > 20 && hasSpecifics) {
      return { level: 'high', passed: true };
    } else if (wordCount > 10) {
      return { level: 'medium', passed: true };
    } else {
      return { level: 'low', passed: false };
    }
  }

  getPrerequisiteRecommendations(checks) {
    const recommendations = [];
    
    if (!checks.fileExists) {
      recommendations.push('파일 경로를 다시 확인하세요');
    }
    
    if (!checks.hasBackup) {
      recommendations.push('create_safety_backup을 먼저 실행하세요');
    }
    
    if (!checks.understandingQuality.passed) {
      recommendations.push('원본 코드를 더 자세히 분석하세요');
    }
    
    if (!checks.changeClarity.passed) {
      recommendations.push('변경사항을 더 구체적으로 설명하세요');
    }
    
    return recommendations;
  }

  generateRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.risks.some(r => r.level === 'critical')) {
      recommendations.push('🔴 즉시 수정을 중단하고 문제를 해결하세요');
    }
    
    if (analysis.summary.changeRatio > 0.5) {
      recommendations.push('🟠 변경 폭이 큽니다. diff 방식으로 나누어 진행하세요');
    }
    
    if (analysis.changes.functions?.removed.length > 0) {
      recommendations.push('⚠️ 함수가 삭제되었습니다. 의도한 변경인지 확인하세요');
    }
    
    return recommendations;
  }

  generateChecklist(strategy) {
    // 전략에 따른 체크리스트 생성
    return [
      '백업이 생성되었나요?',
      '원본 코드를 완전히 이해했나요?',
      '변경사항이 명확한가요?',
      '테스트 계획이 있나요?'
    ];
  }
}
