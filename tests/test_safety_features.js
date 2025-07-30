#!/usr/bin/env node

/**
 * AI 안전 기능 테스트
 * 
 * 이 스크립트는 새로 추가된 안전 기능들을 테스트합니다:
 * - 코드 검증 시스템
 * - 백업/복원 기능
 * - 안전 가이드라인 제공
 * - 위험 신호 감지
 */

import { FullContextInputMCPServer } from '../src/FullContextInputMCPServer.js';
import fs from 'fs';
import path from 'path';

/**
 * 테스트용 샘플 코드들
 */
const SAMPLE_CODES = {
  valid: `
function calculateSum(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('Arguments must be numbers');
  }
  return a + b;
}

export { calculateSum };
`,
  
  invalid: `
function calculateSum(a, b {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('Arguments must be numbers');
  return a + b;
}
// 괄호 불일치, export 누락
`,
  
  incomplete: `
function calculateSum(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('Arguments must be numbers');
  }
  // 함수가 완성되지 않음...
`,

  modified: `
function calculateSum(a, b) {
  // 개선된 버전
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    throw new Error('Arguments must be finite numbers');
  }
  return a + b;
}

function multiply(a, b) {
  return a * b;
}

export { calculateSum, multiply };
`
};

class SafetyFeaturesTester {
  constructor() {
    this.server = new FullContextInputMCPServer();
    this.testDir = path.join(process.cwd(), 'tests', 'safety_test_files');
    this.results = [];
    this.setupTestDirectory();
  }

  /**
   * 테스트 디렉토리 설정
   */
  setupTestDirectory() {
    if (!fs.existsSync(this.testDir)) {
      fs.mkdirSync(this.testDir, { recursive: true });
    }
    
    // 테스트용 파일 생성
    const testFile = path.join(this.testDir, 'sample.js');
    fs.writeFileSync(testFile, SAMPLE_CODES.valid);
  }

  /**
   * 테스트 실행
   */
  async runAllTests() {
    console.log('🛡️  AI 안전 기능 테스트 시작...\n');

    try {
      // 서버 시작
      await this.server.run();
      console.log('✅ 서버 시작 완료\n');

      // 각 테스트 실행
      await this.testBackupAndRestore();
      await this.testCodeValidation();
      await this.testCodeAnalysis();
      await this.testSafetyGuidelines();
      await this.testPrerequisiteCheck();
      await this.testEditStrategy();

      // 결과 리포트
      this.printReport();

    } catch (error) {
      console.error('❌ 테스트 실행 중 오류:', error);
    }
  }

  /**
   * 백업 및 복원 테스트
   */
  async testBackupAndRestore() {
    console.log('📋 테스트 1: 백업 및 복원 기능');
    
    const testFile = path.join(this.testDir, 'sample.js');
    
    try {
      // 1. 백업 생성 테스트
      const backupResult = await this.callTool('create_safety_backup', {
        file_path: testFile,
        reason: '테스트를 위한 백업'
      });
      
      console.log('  ✅ 백업 생성:', backupResult.success ? '성공' : '실패');
      if (backupResult.success) {
        console.log(`     백업 위치: ${backupResult.backupPath}`);
      }
      
      // 2. 파일 수정
      fs.writeFileSync(testFile, SAMPLE_CODES.modified);
      console.log('  ✅ 파일 수정 완료');
      
      // 3. 복원 테스트
      const restoreResult = await this.callTool('restore_from_backup', {
        file_path: testFile
      });
      
      console.log('  ✅ 복원:', restoreResult.success ? '성공' : '실패');
      
      this.results.push({
        test: '백업/복원',
        passed: backupResult.success && restoreResult.success
      });
      
    } catch (error) {
      console.log('  ❌ 백업/복원 테스트 실패:', error.message);
      this.results.push({ test: '백업/복원', passed: false });
    }
    
    console.log('');
  }

  /**
   * 코드 검증 테스트
   */
  async testCodeValidation() {
    console.log('📋 테스트 2: 코드 검증 기능');
    
    try {
      // 1. 유효한 코드 검증
      const validResult = await this.callTool('validate_code_integrity', {
        code_content: SAMPLE_CODES.valid,
        file_path: 'test.js'
      });
      
      console.log('  ✅ 유효한 코드 검증:', validResult.validation?.isValid ? '통과' : '실패');
      
      // 2. 무효한 코드 검증
      const invalidResult = await this.callTool('validate_code_integrity', {
        code_content: SAMPLE_CODES.invalid,
        file_path: 'test.js'
      });
      
      console.log('  ✅ 무효한 코드 검증:', !invalidResult.validation?.isValid ? '통과' : '실패');
      
      // 3. 불완전한 코드 검증
      const incompleteResult = await this.callTool('validate_code_integrity', {
        code_content: SAMPLE_CODES.incomplete,
        file_path: 'test.js'
      });
      
      console.log('  ✅ 불완전한 코드 검증:', !incompleteResult.validation?.isValid ? '통과' : '실패');
      
      this.results.push({
        test: '코드검증',
        passed: validResult.validation?.isValid && 
                !invalidResult.validation?.isValid && 
                !incompleteResult.validation?.isValid
      });
      
    } catch (error) {
      console.log('  ❌ 코드 검증 테스트 실패:', error.message);
      this.results.push({ test: '코드검증', passed: false });
    }
    
    console.log('');
  }

  /**
   * 코드 변경 분석 테스트
   */
  async testCodeAnalysis() {
    console.log('📋 테스트 3: 코드 변경 분석');
    
    try {
      const analysisResult = await this.callTool('analyze_code_changes', {
        original_content: SAMPLE_CODES.valid,
        new_content: SAMPLE_CODES.modified,
        file_path: 'test.js'
      });
      
      const analysis = analysisResult.analysis;
      console.log('  ✅ 변경 분석 실행:', analysisResult.success ? '성공' : '실패');
      
      if (analysis) {
        console.log(`     라인 변화: ${analysis.summary.originalLines} → ${analysis.summary.newLines}`);
        console.log(`     함수 변화: ${analysis.changes.functions?.total.original} → ${analysis.changes.functions?.total.new}`);
        console.log(`     위험 신호: ${analysis.risks?.length || 0}개`);
      }
      
      this.results.push({
        test: '변경분석',
        passed: analysisResult.success && analysis?.summary
      });
      
    } catch (error) {
      console.log('  ❌ 변경 분석 테스트 실패:', error.message);
      this.results.push({ test: '변경분석', passed: false });
    }
    
    console.log('');
  }

  /**
   * 안전 가이드라인 테스트
   */
  async testSafetyGuidelines() {
    console.log('📋 테스트 4: 안전 가이드라인');
    
    try {
      const guidelineResult = await this.callTool('get_ai_safety_guidelines', {
        operation_type: 'complete_rewrite',
        complexity_level: 'medium'
      });
      
      console.log('  ✅ 가이드라인 제공:', guidelineResult.success ? '성공' : '실패');
      
      if (guidelineResult.guidelines) {
        console.log(`     체크리스트: ${guidelineResult.guidelines.checklist?.length || 0}개 항목`);
        console.log(`     경고사항: ${guidelineResult.guidelines.warnings?.length || 0}개 항목`);
      }
      
      this.results.push({
        test: '가이드라인',
        passed: guidelineResult.success && guidelineResult.guidelines
      });
      
    } catch (error) {
      console.log('  ❌ 가이드라인 테스트 실패:', error.message);
      this.results.push({ test: '가이드라인', passed: false });
    }
    
    console.log('');
  }

  /**
   * 전제조건 확인 테스트
   */
  async testPrerequisiteCheck() {
    console.log('📋 테스트 5: 전제조건 확인');
    
    try {
      const testFile = path.join(this.testDir, 'sample.js');
      
      const checkResult = await this.callTool('check_prerequisites', {
        file_path: testFile,
        understanding_summary: 'This is a simple calculator function that adds two numbers together with type checking.',
        proposed_changes: 'Add input validation and create a multiply function'
      });
      
      console.log('  ✅ 전제조건 확인:', checkResult.success ? '성공' : '실패');
      
      if (checkResult.checks) {
        console.log(`     파일 존재: ${checkResult.checks.fileExists ? '✅' : '❌'}`);
        console.log(`     백업 상태: ${checkResult.checks.hasBackup ? '✅' : '❌'}`);
        console.log(`     전체 평가: ${checkResult.checks.overall}`);
      }
      
      this.results.push({
        test: '전제조건',
        passed: checkResult.success && checkResult.checks
      });
      
    } catch (error) {
      console.log('  ❌ 전제조건 테스트 실패:', error.message);
      this.results.push({ test: '전제조건', passed: false });
    }
    
    console.log('');
  }

  /**
   * 편집 전략 제안 테스트
   */
  async testEditStrategy() {
    console.log('📋 테스트 6: 편집 전략 제안');
    
    try {
      const testFile = path.join(this.testDir, 'sample.js');
      
      const strategyResult = await this.callTool('suggest_safe_edit_strategy', {
        file_path: testFile,
        edit_intention: 'Add error handling and improve function documentation',
        target_lines: '1-10'
      });
      
      console.log('  ✅ 전략 제안:', strategyResult.success ? '성공' : '실패');
      
      if (strategyResult.strategy) {
        console.log(`     추천 전략: ${strategyResult.strategy.recommended}`);
        console.log(`     단계 수: ${strategyResult.strategy.steps?.length || 0}개`);
      }
      
      this.results.push({
        test: '편집전략',
        passed: strategyResult.success && strategyResult.strategy
      });
      
    } catch (error) {
      console.log('  ❌ 편집 전략 테스트 실패:', error.message);
      this.results.push({ test: '편집전략', passed: false });
    }
    
    console.log('');
  }

  /**
   * MCP 도구 호출
   */
  async callTool(toolName, args) {
    try {
      const handler = this.server.baseServer.getServer().getRequestHandler({
        method: 'tools/call',
        params: { name: toolName, arguments: args }
      });
      
      if (!handler) {
        throw new Error(`Handler not found for tool: ${toolName}`);
      }
      
      return await this.server.safetyHandler[this.getHandlerMethod(toolName)](...Object.values(args));
      
    } catch (error) {
      console.error(`Tool call failed: ${toolName}`, error);
      throw error;
    }
  }

  /**
   * 도구명에서 핸들러 메서드명 변환
   */
  getHandlerMethod(toolName) {
    const methodMap = {
      'create_safety_backup': 'createSafetyBackup',
      'restore_from_backup': 'restoreFromBackup',
      'analyze_code_changes': 'analyzeCodeChanges',
      'validate_code_integrity': 'validateCodeIntegrity',
      'suggest_safe_edit_strategy': 'suggestSafeEditStrategy',
      'get_ai_safety_guidelines': 'getAISafetyGuidelines',
      'check_prerequisites': 'checkPrerequisites'
    };
    
    return methodMap[toolName] || toolName;
  }

  /**
   * 테스트 결과 출력
   */
  printReport() {
    console.log('📊 테스트 결과 요약');
    console.log('==================');
    
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    
    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.test}`);
    });
    
    console.log(`\n총 ${total}개 테스트 중 ${passed}개 통과 (${Math.round(passed/total*100)}%)`);
    
    if (passed === total) {
      console.log('🎉 모든 안전 기능이 정상적으로 작동합니다!');
    } else {
      console.log('⚠️  일부 기능에 문제가 있습니다. 로그를 확인해주세요.');
    }
  }

  /**
   * 정리
   */
  cleanup() {
    // 테스트 파일 정리 (옵션)
    if (fs.existsSync(this.testDir)) {
      fs.rmSync(this.testDir, { recursive: true, force: true });
      console.log('🧹 테스트 파일 정리 완료');
    }
  }
}

// 테스트 실행
async function main() {
  const tester = new SafetyFeaturesTester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('테스트 실행 실패:', error);
  } finally {
    // tester.cleanup(); // 테스트 파일 유지하려면 주석 처리
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { SafetyFeaturesTester };
