import fs from 'fs';
import path from 'path';
import { FileUtils } from '../core/FileUtils.js';

/**
 * 파일 읽기 관련 기능을 담당하는 핸들러
 */
export class FileHandler {
  constructor(baseServer) {
    this.baseServer = baseServer;
  }

  /**
   * 파일 내용 읽기 (Rate Limiting 적용, 큰 파일 감지)
   */
  async readFileContent(filePath) {
    try {
      // Rate Limiting 대기
      await this.baseServer.waitForRateLimit();
      
      // 캐시 확인
      const cached = this.baseServer.getCachedFile(filePath);
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

=== 1-200줄 (${remainingLines}줄 더 남음) ===
${first200Lines.join('\n')}
=== 첫 200줄 완료 ===

💡 다음 청크를 읽으려면:
- read_file_chunk("${filePath}", chunk_number=1) // 201-400줄
- read_file_chunk("${filePath}", chunk_number=2) // 401-600줄
...총 ${Math.ceil(totalLines/200)}개 청크

🔍 또는 특정 라인만:
- read_file_lines("${filePath}", start_line=201, end_line=400)
- get_file_info("${filePath}") // 파일 정보만`
            }
          ]
        };
      } else if (stats.size > 10240) { // 10KB 초과
        // 중간 크기 파일: 미리보기 + 옵션 제공
        const first100Lines = lines.slice(0, 100);
        const remainingLines = totalLines - 100;
        
        result = {
          content: [
            {
              type: 'text',
              text: `파일: ${filePath}
크기: ${stats.size} bytes (${sizeKB}KB)
라인 수: ${totalLines}
수정일: ${stats.mtime.toISOString()}

📋 중간 크기 파일 - 처음 100줄 미리보기
${remainingLines > 0 ? `(${remainingLines}줄 더 남음)` : ''}

=== 처음 100줄 ===
${first100Lines.join('\n')}
=== 미리보기 완료 ===

💡 전체 파일을 읽으려면:
- read_file_chunk("${filePath}") // 200줄씩 청크
- read_file_lines("${filePath}", start_line=101) // 101줄부터`
            }
          ]
        };
      } else {
        // 작은 파일: 전체 제공
        result = {
          content: [
            {
              type: 'text',
              text: `파일: ${filePath}
크기: ${stats.size} bytes (${sizeKB}KB)
라인 수: ${totalLines}
수정일: ${stats.mtime.toISOString()}

=== 파일 전체 내용 ===
${lines.join('\n')}
=== 파일 완료 ===`
            }
          ]
        };
      }
      
      // 캐시에 저장 (작은 파일만)
      if (stats.size < 51200) { // 50KB 미만만 캐시
        this.baseServer.setCachedFile(filePath, result);
      }
      
      return result;
      
    } catch (error) {
      throw new Error(`파일 읽기 실패: ${filePath} - ${error.message}`);
    }
  }

  /**
   * 파일 정보 조회 (내용 제외)
   */
  async getFileInfo(filePath) {
    try {
      await this.baseServer.waitForRateLimit();
      
      const stats = fs.statSync(filePath);
      const isTextFile = FileUtils.isTextFile(filePath);
      
      let lineCount = 0;
      let recommendedAction = '';
      
      if (isTextFile) {
        lineCount = FileUtils.getFileLineCount(filePath);
        
        if (lineCount > 300) {
          recommendedAction = `📚 큰 파일 (${lineCount}줄):
• read_file_chunk("${filePath}") - 200줄씩 청크 읽기
• read_file_lines("${filePath}", start_line=1, end_line=100) - 특정 범위`;
        } else if (lineCount > 100) {
          recommendedAction = `📖 중간 파일 (${lineCount}줄):
• read_file_content("${filePath}") - 미리보기
• read_file_lines("${filePath}") - 특정 범위`;
        } else {
          recommendedAction = `📄 작은 파일 (${lineCount}줄):
• read_file_content("${filePath}") - 전체 읽기`;
        }
      } else {
        recommendedAction = '⚠️ 바이너리 파일 - 텍스트로 읽기 불가';
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `📁 파일 정보: ${filePath}

📊 기본 정보:
- 크기: ${stats.size} bytes (${FileUtils.bytesToKB(stats.size)}KB)
- 수정일: ${stats.mtime.toISOString()}
- 생성일: ${stats.birthtime.toISOString()}
- 권한: ${stats.mode.toString(8)}
- 타입: ${isTextFile ? '텍스트 파일' : '바이너리 파일'}
${isTextFile ? `- 라인 수: ${lineCount}줄` : ''}

${recommendedAction}`
          }
        ]
      };
    } catch (error) {
      throw new Error(`파일 정보 조회 실패: ${filePath} - ${error.message}`);
    }
  }

  /**
   * 파일을 청크 단위로 읽기 (라인 기반)
   */
  async readFileChunk(filePath, linesPerChunk = 200, chunkNumber = 0) {
    try {
      await this.baseServer.waitForRateLimit();
      
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
      const chunkLines = lines.slice(startLine, endLine + 1);
      const chunkContent = chunkLines.join('\n');
      const chunkSizeKB = FileUtils.bytesToKB(Buffer.byteLength(chunkContent, 'utf8'));
      
      return {
        content: [
          {
            type: 'text',
            text: `파일: ${filePath}
총 크기: ${stats.size} bytes (${FileUtils.bytesToKB(stats.size)}KB)
총 라인 수: ${totalLines}

📊 ${chunkNumber + 1}/${totalChunks} 청크 (${linesPerChunk}줄씩 분할)
라인 범위: ${startLine + 1}-${endLine + 1} (이 청크: ${chunkSizeKB}KB)

=== 청크 ${chunkNumber + 1}/${totalChunks} 시작 ===
${chunkContent}
=== 청크 완료 ===

${chunkNumber + 1 < totalChunks ? 
  `💡 다음 청크 읽기: read_file_chunk("${filePath}", ${linesPerChunk}, ${chunkNumber + 1})` : 
  '✅ 모든 청크를 읽었습니다!'
}`
          }
        ]
      };
    } catch (error) {
      throw new Error(`파일 청크 읽기 실패: ${filePath} - ${error.message}`);
    }
  }

  /**
   * 파일의 특정 라인 범위 읽기
   */
  async readFileLines(filePath, startLine = 1, endLine = null, maxLines = 100) {
    try {
      await this.baseServer.waitForRateLimit();
      
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
총 크기: ${stats.size} bytes (${FileUtils.bytesToKB(stats.size)}KB)
총 라인 수: ${totalLines}
표시 범위: ${startLine}-${actualEndLine} (${actualEndLine - startLine + 1}줄)

=== 라인 ${startLine}-${actualEndLine} ===
${selectedContent}
=== 라인 범위 끝 ===

💡 다른 라인을 읽으려면:
${actualEndLine < totalLines ? `- read_file_lines("${filePath}", ${actualEndLine + 1}, ${Math.min(actualEndLine + maxLines, totalLines)})` : '- 파일의 모든 라인을 읽었습니다.'}
- read_file_lines("${filePath}", 1, ${Math.min(100, totalLines)}) // 처음 100줄
- read_file_lines("${filePath}", ${Math.max(1, totalLines - 99)}, ${totalLines}) // 마지막 100줄`
          }
        ]
      };
    } catch (error) {
      throw new Error(`파일 라인 읽기 실패: ${filePath} - ${error.message}`);
    }
  }

  /**
   * 지능형 파일 읽기 - 크기에 따라 자동 판단
   */
  async readFileSmart(filePath, chunkNumber = 0, linesPerChunk = 200) {
    try {
      await this.baseServer.waitForRateLimit();
      
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
크기: ${stats.size} bytes (${FileUtils.bytesToKB(stats.size)}KB)
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
      const chunkSizeKB = FileUtils.bytesToKB(Buffer.byteLength(chunkContent, 'utf8'));
      
      return {
        content: [
          {
            type: 'text',
            text: `파일: ${filePath}
총 크기: ${stats.size} bytes (${FileUtils.bytesToKB(stats.size)}KB)
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
}
