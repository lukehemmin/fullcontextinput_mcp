import fs from 'fs';
import path from 'path';
import { FileUtils } from '../core/FileUtils.js';
import { CodeValidator } from '../core/CodeValidator.js';

/**
 * 파일 쓰기 관련 기능을 담당하는 핸들러
 */
export class WriteHandler {
  constructor(baseServer) {
    this.baseServer = baseServer;
  }

  /**
   * 파일 전체 작성 (짧은 코드용)
   */
  async writeFileComplete(filePath, content, encoding = 'utf8') {
    try {
      // Rate Limiting 대기
      await this.baseServer.waitForRateLimit();
      
      // 🛡️ AI 안전 가이드라인 생성
      const guidelines = CodeValidator.generateAIGuidelines(filePath, 'complete');
      
      // 🔍 코드 검증 실행
      const originalContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
      const validation = CodeValidator.validateCompleteReplace(filePath, content, originalContent);
      
      // ❌ 검증 실패 시 중단
      if (!validation.isValid) {
        throw new Error(`코드 검증 실패:\n${validation.errors.join('\n')}\n\n${guidelines}`);
      }
      
      // 디렉토리가 없으면 생성
      const dirPath = path.dirname(filePath);
      FileUtils.ensureDirectoryExists(dirPath);
      
      // 기존 파일 백업 (있는 경우)
      let backupPath = null;
      let originalExists = false;
      if (fs.existsSync(filePath)) {
        originalExists = true;
        backupPath = FileUtils.createBackupPath(filePath);
        
        // 백업 생성
        fs.copyFileSync(filePath, backupPath);
      }
      
      // 새 파일 작성
      fs.writeFileSync(filePath, content, encoding);
      
      // 결과 정보
      const stats = fs.statSync(filePath);
      const lines = content.split('\n');
      const lineCount = lines.length;
      const sizeKB = FileUtils.bytesToKB(stats.size);
      
      // 캐시 무효화
      this.baseServer.invalidateCache(filePath);
      
      // 🛡️ 검증 결과 포함한 응답 생성
      let validationReport = '';
      if (validation.warnings.length > 0) {
        validationReport += `\n⚠️ 검증 경고:\n${validation.warnings.join('\n')}\n`;
      }
      if (validation.suggestions.length > 0) {
        validationReport += `\n💡 제안사항:\n${validation.suggestions.join('\n')}\n`;
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ 파일 작성 완료: ${filePath}\n${validationReport}
📊 파일 정보:
- 라인 수: ${lineCount}줄
- 파일 크기: ${sizeKB}KB
- 인코딩: ${encoding}
- 작성 시간: ${new Date().toISOString()}

📁 파일 상태:
- ${originalExists ? '기존 파일 교체됨' : '새 파일 생성됨'}
- 디렉토리: ${dirPath}
${originalExists ? `- 백업 생성: ${backupPath}` : ''}

🎯 작성 모드: 전체 파일 교체 (Complete)
💡 이 기능은 5000-6000토큰 미만의 짧은 코드에 최적화되어 있습니다.

🛡️ 코드 안전성: ${validation.isValid ? '✅ 검증 통과' : '⚠️ 경고 있음'}

🔍 작성된 내용 미리보기:
=== 처음 10줄 ===
${lines.slice(0, 10).join('\n')}
${lines.length > 10 ? `... (총 ${lineCount}줄)` : ''}
=== 미리보기 끝 ===`
          }
        ]
      };
    } catch (error) {
      throw new Error(`파일 작성 실패: ${filePath} - ${error.message}`);
    }
  }

  /**
   * 파일 Diff 수정 (긴 코드용)
   */
  async writeFileDiff(filePath, startLine, endLine, newContent, createBackup = true) {
    try {
      // Rate Limiting 대기
      await this.baseServer.waitForRateLimit();
      
      // 🛡️ AI 안전 가이드라인 생성
      const guidelines = CodeValidator.generateAIGuidelines(filePath, 'diff');
      
      // 원본 파일 읽기
      if (!fs.existsSync(filePath)) {
        throw new Error(`파일이 존재하지 않습니다: ${filePath}`);
      }
      
      // 🔍 Diff 검증 실행
      const validation = CodeValidator.validateDiffModification(filePath, startLine, endLine, newContent);
      
      // ❌ 검증 실패 시 중단
      if (!validation.isValid) {
        throw new Error(`Diff 검증 실패:\n${validation.errors.join('\n')}\n\n${guidelines}`);
      }
      
      const originalContent = fs.readFileSync(filePath, 'utf8');
      const originalLines = originalContent.split('\n');
      const totalLines = originalLines.length;
      
      // 라인 번호 유효성 검사
      if (startLine < 1 || startLine > totalLines) {
        throw new Error(`시작 라인이 유효하지 않습니다. 1-${totalLines} 범위여야 합니다.`);
      }
      if (endLine < startLine || endLine > totalLines) {
        throw new Error(`끝 라인이 유효하지 않습니다. ${startLine}-${totalLines} 범위여야 합니다.`);
      }
      
      // 백업 생성 (옵션)
      let backupPath = null;
      if (createBackup) {
        backupPath = FileUtils.createBackupPath(filePath);
        fs.copyFileSync(filePath, backupPath);
      }
      
      // 새 내용 라인 분할
      const newContentLines = newContent.split('\n');
      
      // 라인 교체 (0-based 인덱스로 변환)
      const modifiedLines = [
        ...originalLines.slice(0, startLine - 1),  // 시작 전 라인들
        ...newContentLines,                         // 새로운 내용
        ...originalLines.slice(endLine)             // 끝 후 라인들
      ];
      
      // 수정된 내용으로 파일 덮어쓰기
      const modifiedContent = modifiedLines.join('\n');
      
      // 파일 쓰기
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      
      // 결과 정보
      const newStats = fs.statSync(filePath);
      const newTotalLines = modifiedLines.length;
      const newSizeKB = FileUtils.bytesToKB(newStats.size);
      
      // 변경 통계
      const originalRangeLines = endLine - startLine + 1;
      const newRangeLines = newContentLines.length;
      const lineDelta = newRangeLines - originalRangeLines;
      
      // 캐시 무효화
      this.baseServer.invalidateCache(filePath);
      
      // 🛡️ 검증 결과 포함한 응답 생성
      let validationReport = '';
      if (validation.warnings.length > 0) {
        validationReport += `\n⚠️ 검증 경고:\n${validation.warnings.join('\n')}\n`;
      }
      if (validation.suggestions.length > 0) {
        validationReport += `\n💡 제안사항:\n${validation.suggestions.join('\n')}\n`;
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Diff 수정 완료: ${filePath}\n${validationReport}
📊 수정 정보:
- 수정 범위: ${startLine}-${endLine}줄 (${originalRangeLines}줄 → ${newRangeLines}줄)
- 라인 변화: ${lineDelta >= 0 ? '+' : ''}${lineDelta}줄
- 전체 라인: ${totalLines}줄 → ${newTotalLines}줄
- 파일 크기: ${newSizeKB}KB
- 수정 시간: ${new Date().toISOString()}

${createBackup ? 
  `📋 백업 정보:
- 백업 생성: ${backupPath}
- 원본 보관됨` : 
  '📋 백업 생성 안함'
}

🎯 수정 모드: 라인 범위 교체 (Diff)
💡 이 기능은 6000토큰 초과의 긴 코드 수정에 최적화되어 있습니다.

🛡️ 코드 안전성: ${validation.warnings.length === 0 ? '✅ 검증 통과' : '⚠️ 경고 있음'}

🔍 수정된 내용 미리보기:
=== 새로 추가된 코드 (${newRangeLines}줄) ===
${newContent.slice(0, 500)}${newContent.length > 500 ? '\n... (총 ' + newRangeLines + '줄)' : ''}
=== 미리보기 끝 ===`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Diff 수정 실패: ${filePath} - ${error.message}`);
    }
  }

  /**
   * 파일에 내용 추가 (append)
   */
  async appendToFile(filePath, content, encoding = 'utf8') {
    try {
      await this.baseServer.waitForRateLimit();
      
      // 디렉토리가 없으면 생성
      const dirPath = path.dirname(filePath);
      FileUtils.ensureDirectoryExists(dirPath);
      
      // 파일이 존재하지 않으면 새로 생성
      if (!fs.existsSync(filePath)) {
        return await this.writeFileComplete(filePath, content, encoding);
      }
      
      // 기존 파일에 내용 추가
      fs.appendFileSync(filePath, '\n' + content, encoding);
      
      // 결과 정보
      const stats = fs.statSync(filePath);
      const totalContent = fs.readFileSync(filePath, 'utf8');
      const totalLines = totalContent.split('\n').length;
      const addedLines = content.split('\n').length;
      const sizeKB = FileUtils.bytesToKB(stats.size);
      
      // 캐시 무효화
      this.baseServer.invalidateCache(filePath);
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ 내용 추가 완료: ${filePath}

📊 추가 정보:
- 추가된 라인: ${addedLines}줄
- 전체 라인: ${totalLines}줄
- 파일 크기: ${sizeKB}KB
- 수정 시간: ${new Date().toISOString()}

🎯 작업 모드: 파일 끝에 내용 추가 (Append)

🔍 추가된 내용 미리보기:
=== 추가된 내용 ===
${content.slice(0, 500)}${content.length > 500 ? '\n... (총 ' + addedLines + '줄)' : ''}
=== 미리보기 끝 ===`
          }
        ]
      };
    } catch (error) {
      throw new Error(`내용 추가 실패: ${filePath} - ${error.message}`);
    }
  }

  /**
   * 파일의 특정 라인 삭제
   */
  async deleteLines(filePath, startLine, endLine) {
    try {
      await this.baseServer.waitForRateLimit();
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`파일이 존재하지 않습니다: ${filePath}`);
      }
      
      const originalContent = fs.readFileSync(filePath, 'utf8');
      const originalLines = originalContent.split('\n');
      const totalLines = originalLines.length;
      
      // 라인 번호 유효성 검사
      if (startLine < 1 || startLine > totalLines) {
        throw new Error(`시작 라인이 유효하지 않습니다. 1-${totalLines} 범위여야 합니다.`);
      }
      if (endLine < startLine || endLine > totalLines) {
        throw new Error(`끝 라인이 유효하지 않습니다. ${startLine}-${totalLines} 범위여야 합니다.`);
      }
      
      // 백업 생성
      const backupPath = FileUtils.createBackupPath(filePath);
      fs.copyFileSync(filePath, backupPath);
      
      // 라인 삭제 (0-based 인덱스로 변환)
      const modifiedLines = [
        ...originalLines.slice(0, startLine - 1),  // 시작 전 라인들
        ...originalLines.slice(endLine)             // 끝 후 라인들
      ];
      
      // 수정된 내용으로 파일 덮어쓰기
      const modifiedContent = modifiedLines.join('\n');
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      
      // 결과 정보
      const deletedLines = endLine - startLine + 1;
      const newTotalLines = modifiedLines.length;
      const newStats = fs.statSync(filePath);
      const newSizeKB = FileUtils.bytesToKB(newStats.size);
      
      // 캐시 무효화
      this.baseServer.invalidateCache(filePath);
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ 라인 삭제 완료: ${filePath}

📊 삭제 정보:
- 삭제된 범위: ${startLine}-${endLine}줄 (${deletedLines}줄 삭제)
- 전체 라인: ${totalLines}줄 → ${newTotalLines}줄 (-${deletedLines}줄)
- 파일 크기: ${newSizeKB}KB
- 수정 시간: ${new Date().toISOString()}

📋 백업 정보:
- 백업 생성: ${backupPath}
- 원본 보관됨

🎯 작업 모드: 라인 범위 삭제`
          }
        ]
      };
    } catch (error) {
      throw new Error(`라인 삭제 실패: ${filePath} - ${error.message}`);
    }
  }
}
