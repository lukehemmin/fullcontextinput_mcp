import fs from 'fs';
import { FileUtils } from './FileUtils.js';

/**
 * 코드 검증 및 안전장치 시스템
 * AI의 코드 수정 시 발생할 수 있는 문제들을 사전에 감지하고 방지
 */
export class CodeValidator {
  /**
   * 파일 전체 교체 시 검증
   * @param {string} filePath - 대상 파일 경로
   * @param {string} newContent - 새로운 내용
   * @param {string} originalContent - 원본 내용 (선택사항)
   * @returns {Object} 검증 결과
   */
  static validateCompleteReplace(filePath, newContent, originalContent = null) {
    const validation = {
      isValid: true,
      warnings: [],
      errors: [],
      suggestions: []
    };

    // 원본 파일 읽기 (제공되지 않은 경우)
    if (!originalContent && fs.existsSync(filePath)) {
      originalContent = fs.readFileSync(filePath, 'utf8');
    }

    // 1. 기본 구문 검사
    const syntaxCheck = CodeValidator.validateSyntax(newContent, filePath);
    if (!syntaxCheck.isValid) {
      validation.errors.push(...syntaxCheck.errors);
      validation.isValid = false;
    }

    // 2. 코드 완성도 검사
    const completenessCheck = CodeValidator.validateCompleteness(newContent);
    if (!completenessCheck.isComplete) {
      validation.warnings.push(...completenessCheck.issues);
    }

    // 3. 원본과의 비교 분석
    if (originalContent) {
      const comparisonCheck = CodeValidator.compareWithOriginal(originalContent, newContent);
      validation.warnings.push(...comparisonCheck.warnings);
      validation.suggestions.push(...comparisonCheck.suggestions);
      
      // 심각한 변경사항 감지
      if (comparisonCheck.majorChanges) {
        validation.warnings.push('⚠️ 대량 코드 변경이 감지되었습니다. 신중히 검토하세요.');
      }
    }

    // 4. 파일 크기 급격한 변화 감지
    if (originalContent) {
      const sizeDiff = Math.abs(newContent.length - originalContent.length) / originalContent.length;
      if (sizeDiff > 0.5) { // 50% 이상 변화
        validation.warnings.push(`⚠️ 파일 크기가 ${Math.round(sizeDiff * 100)}% 변했습니다.`);
      }
    }

    return validation;
  }

  /**
   * Diff 수정 시 검증
   * @param {string} filePath - 대상 파일 경로  
   * @param {number} startLine - 시작 라인
   * @param {number} endLine - 끝 라인
   * @param {string} newContent - 새로운 내용
   * @returns {Object} 검증 결과
   */
  static validateDiffModification(filePath, startLine, endLine, newContent) {
    const validation = {
      isValid: true,
      warnings: [],
      errors: [],
      suggestions: []
    };

    if (!fs.existsSync(filePath)) {
      validation.errors.push(`❌ 파일이 존재하지 않습니다: ${filePath}`);
      validation.isValid = false;
      return validation;
    }

    const originalContent = fs.readFileSync(filePath, 'utf8');
    const originalLines = originalContent.split('\n');
    const totalLines = originalLines.length;

    // 1. 라인 범위 유효성 검사
    if (startLine < 1 || startLine > totalLines) {
      validation.errors.push(`❌ 시작 라인이 잘못되었습니다: ${startLine} (1-${totalLines} 범위)`);
      validation.isValid = false;
    }

    if (endLine < startLine || endLine > totalLines) {
      validation.errors.push(`❌ 끝 라인이 잘못되었습니다: ${endLine} (${startLine}-${totalLines} 범위)`);
      validation.isValid = false;
    }

    if (!validation.isValid) return validation;

    // 2. 수정 범위 분석
    const originalRange = originalLines.slice(startLine - 1, endLine).join('\n');
    const rangeAnalysis = CodeValidator.analyzeDiffRange(originalRange, newContent);
    
    validation.warnings.push(...rangeAnalysis.warnings);
    validation.suggestions.push(...rangeAnalysis.suggestions);

    // 3. 컨텍스트 무결성 검사
    const contextCheck = CodeValidator.validateContext(originalLines, startLine, endLine, newContent);
    validation.warnings.push(...contextCheck.warnings);

    // 4. 대량 삭제 감지
    const deletedLines = endLine - startLine + 1;
    const newLines = newContent.split('\n').length;
    
    if (deletedLines > 50 && newLines < deletedLines * 0.3) {
      validation.warnings.push(`🚨 대량 코드 삭제 감지: ${deletedLines}줄 → ${newLines}줄`);
    }

    return validation;
  }

  /**
   * 기본 구문 검사
   */
  static validateSyntax(content, filePath = '') {
    const result = {
      isValid: true,
      errors: []
    };

    const ext = FileUtils.getFileExtension(filePath);
    
    // JavaScript/TypeScript 기본 검사
    if (['js', 'ts', 'jsx', 'tsx'].includes(ext)) {
      // 괄호 매칭 검사
      const brackets = CodeValidator.checkBracketMatching(content);
      if (!brackets.isValid) {
        result.isValid = false;
        result.errors.push(`❌ 괄호 매칭 오류: ${brackets.error}`);
      }

      // 기본 문법 오류 검사
      const syntax = CodeValidator.checkBasicSyntax(content);
      if (!syntax.isValid) {
        result.errors.push(...syntax.errors);
        result.isValid = false;
      }
    }

    return result;
  }

  /**
   * 코드 완성도 검사
   */
  static validateCompleteness(content) {
    const result = {
      isComplete: true,
      issues: []
    };

    // 1. 불완전한 함수/클래스 감지
    const incompleteStructures = CodeValidator.findIncompleteStructures(content);
    if (incompleteStructures.length > 0) {
      result.isComplete = false;
      result.issues.push(`⚠️ 불완전한 구조체 발견: ${incompleteStructures.join(', ')}`);
    }

    // 2. 중단된 코드 라인 감지
    const lines = content.split('\n');
    const lastLine = lines[lines.length - 1].trim();
    
    if (lastLine.endsWith('...') || lastLine.includes('<truncated')) {
      result.isComplete = false;
      result.issues.push('⚠️ 코드가 중간에 잘린 것 같습니다.');
    }

    // 3. 빈 함수/클래스 감지
    const emptyStructures = CodeValidator.findEmptyStructures(content);
    if (emptyStructures.length > 0) {
      result.issues.push(`💡 빈 구조체 발견: ${emptyStructures.join(', ')}`);
    }

    return result;
  }

  /**
   * 원본과 비교 분석
   */
  static compareWithOriginal(originalContent, newContent) {
    const result = {
      warnings: [],
      suggestions: [],
      majorChanges: false
    };

    const originalLines = originalContent.split('\n');
    const newLines = newContent.split('\n');

    // 라인 수 변화 분석
    const lineDiff = newLines.length - originalLines.length;
    if (Math.abs(lineDiff) > originalLines.length * 0.3) { // 30% 이상 변화
      result.majorChanges = true;
      result.warnings.push(`📊 라인 수 대폭 변화: ${originalLines.length} → ${newLines.length} (${lineDiff >= 0 ? '+' : ''}${lineDiff})`);
    }

    // 함수/클래스 유실 검사
    const originalFunctions = CodeValidator.extractFunctions(originalContent);
    const newFunctions = CodeValidator.extractFunctions(newContent);
    
    const lostFunctions = originalFunctions.filter(func => !newFunctions.includes(func));
    if (lostFunctions.length > 0) {
      result.warnings.push(`🚨 함수 유실 가능성: ${lostFunctions.join(', ')}`);
    }

    // 중요한 키워드 유실 검사
    const importantKeywords = ['export', 'import', 'class', 'function', 'async', 'await'];
    for (const keyword of importantKeywords) {
      const originalCount = (originalContent.match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
      const newCount = (newContent.match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
      
      if (newCount < originalCount * 0.7) { // 30% 이상 감소
        result.warnings.push(`⚠️ '${keyword}' 키워드 감소: ${originalCount} → ${newCount}`);
      }
    }

    return result;
  }

  // 헬퍼 메서드들
  static checkBracketMatching(content) {
    const brackets = { '(': ')', '[': ']', '{': '}' };
    const stack = [];
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      
      if (char in brackets) {
        stack.push({ char, pos: i });
      } else if (Object.values(brackets).includes(char)) {
        if (stack.length === 0) {
          return { isValid: false, error: `위치 ${i}에서 열린 괄호 없이 닫힌 괄호 발견` };
        }
        
        const last = stack.pop();
        if (brackets[last.char] !== char) {
          return { isValid: false, error: `위치 ${i}에서 괄호 불일치: '${last.char}' vs '${char}'` };
        }
      }
    }
    
    if (stack.length > 0) {
      return { isValid: false, error: `${stack.length}개의 괄호가 닫히지 않음` };
    }
    
    return { isValid: true };
  }

  static checkBasicSyntax(content) {
    const result = { isValid: true, errors: [] };
    
    // 기본적인 JavaScript 문법 오류들 검사
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // 세미콜론 누락 (간단한 검사)
      if (trimmed.length > 0 && 
          !trimmed.endsWith(';') && 
          !trimmed.endsWith('{') && 
          !trimmed.endsWith('}') &&
          !trimmed.startsWith('//') &&
          !trimmed.startsWith('*') &&
          !trimmed.includes('//')) {
        // 몇 가지 예외 제외하고 세미콜론 누락 경고는 너무 많을 수 있으므로 생략
      }
    });
    
    return result;
  }

  static findIncompleteStructures(content) {
    const incomplete = [];
    
    // 불완전한 함수 찾기
    const functionMatches = content.match(/function\s+\w+\s*\([^)]*\)\s*\{/g) || [];
    const asyncFunctionMatches = content.match(/async\s+function\s+\w+\s*\([^)]*\)\s*\{/g) || [];
    const arrowFunctionMatches = content.match(/\w+\s*=\s*\([^)]*\)\s*=>\s*\{/g) || [];
    
    // 간단한 검사: 함수 선언이 있는데 대응하는 닫는 괄호가 부족한지 확인
    const totalFunctions = functionMatches.length + asyncFunctionMatches.length + arrowFunctionMatches.length;
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    
    if (totalFunctions > 0 && openBraces > closeBraces) {
      incomplete.push(`${totalFunctions}개 함수 중 일부 미완성`);
    }
    
    return incomplete;
  }

  static findEmptyStructures(content) {
    const empty = [];
    
    // 빈 함수 찾기
    const emptyFunctions = content.match(/function\s+\w+\s*\([^)]*\)\s*\{\s*\}/g) || [];
    if (emptyFunctions.length > 0) {
      empty.push(`${emptyFunctions.length}개 빈 함수`);
    }
    
    return empty;
  }

  static extractFunctions(content) {
    const functions = [];
    
    // 함수명 추출
    const functionMatches = content.match(/(?:function\s+|async\s+function\s+)(\w+)/g) || [];
    const arrowFunctionMatches = content.match(/(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g) || [];
    const methodMatches = content.match(/(\w+)\s*\([^)]*\)\s*\{/g) || [];
    
    functionMatches.forEach(match => {
      const name = match.replace(/(?:async\s+)?function\s+/, '');
      if (name) functions.push(name);
    });
    
    return [...new Set(functions)]; // 중복 제거
  }

  static analyzeDiffRange(originalRange, newContent) {
    const result = {
      warnings: [],
      suggestions: []
    };

    // 너무 많은 변경 감지
    const similarity = CodeValidator.calculateSimilarity(originalRange, newContent);
    if (similarity < 0.3) { // 30% 미만 유사도
      result.warnings.push('⚠️ 원본과 매우 다른 코드입니다. 의도한 수정인지 확인하세요.');
    }

    return result;
  }

  static validateContext(originalLines, startLine, endLine, newContent) {
    const result = { warnings: [] };
    
    // 수정 전후 라인의 들여쓰기 검사
    if (startLine > 1) {
      const prevLine = originalLines[startLine - 2];
      const newFirstLine = newContent.split('\n')[0];
      
      const prevIndent = prevLine.match(/^\s*/)[0].length;
      const newIndent = newFirstLine.match(/^\s*/)[0].length;
      
      if (Math.abs(prevIndent - newIndent) > 4) {
        result.warnings.push('⚠️ 들여쓰기가 주변 코드와 일치하지 않습니다.');
      }
    }
    
    return result;
  }

  static calculateSimilarity(text1, text2) {
    // 간단한 유사도 계산 (실제로는 더 정교한 알고리즘 사용 가능)
    const words1 = text1.toLowerCase().split(/\W+/);
    const words2 = text2.toLowerCase().split(/\W+/);
    
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  /**
   * AI를 위한 안전 가이드라인 생성
   */
  static generateAIGuidelines(filePath, operation = 'modify') {
    const guidelines = [];
    
    guidelines.push('🤖 AI 코드 수정 안전 가이드라인:');
    guidelines.push('1. ✅ 기존 코드를 완전히 이해하고 수정하세요');
    guidelines.push('2. ✅ 함수/클래스 구조를 반드시 보존하세요');
    guidelines.push('3. ✅ Import/Export 문을 누락하지 마세요');
    guidelines.push('4. ✅ 주석과 문서화도 함께 유지하세요');
    guidelines.push('5. 🚨 코드가 중간에 잘리면 "...계속" 이라고 명시하세요');
    guidelines.push('6. 🚨 불확실하면 diff 방식을 사용하세요');
    
    if (operation === 'complete') {
      guidelines.push('7. 📝 전체 교체 시: 모든 기존 기능을 포함해야 합니다');
    } else if (operation === 'diff') {
      guidelines.push('7. 📝 부분 수정 시: 정확한 라인 번호를 확인하세요');
    }
    
    return guidelines.join('\n');
  }
}
