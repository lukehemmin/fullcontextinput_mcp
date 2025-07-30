import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

/**
 * 프롬프트 분석 및 파일 감지 기능을 담당하는 핸들러
 */
export class AnalysisHandler {
  constructor(baseServer) {
    this.baseServer = baseServer;
  }

  /**
   * 프롬프트 분석 및 자동 파일/디렉토리 감지
   */
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
        content: [
          {
            type: 'text',
            text: JSON.stringify(analysis, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`프롬프트 분석 실패: ${error.message}`);
    }
  }

  /**
   * 프롬프트에서 파일 콘텐츠 추출 및 제공
   */
  async extractFileContent(prompt, workspacePath = '.') {
    try {
      await this.baseServer.waitForRateLimit();
      
      // 파일 패턴 추출
      const filePatterns = this.extractFilePatterns(prompt);
      const directoryPatterns = this.extractDirectoryPatterns(prompt);
      
      const foundFiles = [];
      const foundDirectories = [];
      const results = [];
      
      // 파일 패턴으로 파일 찾기
      for (const pattern of filePatterns) {
        const matchingFiles = await this.findMatchingFiles(pattern, workspacePath);
        foundFiles.push(...matchingFiles);
      }
      
      // 디렉토리 패턴으로 디렉토리 찾기
      for (const pattern of directoryPatterns) {
        const fullPath = path.resolve(workspacePath, pattern);
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
          foundDirectories.push(fullPath);
        }
      }
      
      // 찾은 파일들 읽기
      for (const filePath of foundFiles.slice(0, 10)) { // 최대 10개 제한
        try {
          const stats = fs.statSync(filePath);
          const relativePath = path.relative(workspacePath, filePath);
          
          if (stats.size > 51200) { // 50KB 초과
            results.push({
              path: relativePath,
              type: 'file_too_large',
              size: stats.size,
              message: `파일이 너무 큽니다 (${Math.round(stats.size/1024)}KB). read_file_chunk 또는 read_file_lines를 사용하세요.`
            });
          } else {
            const content = fs.readFileSync(filePath, 'utf8');
            results.push({
              path: relativePath,
              type: 'file_content',
              size: stats.size,
              content: content
            });
          }
        } catch (error) {
          results.push({
            path: path.relative(workspacePath, filePath),
            type: 'error',
            error: error.message
          });
        }
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              workspace_path: workspacePath,
              detected_patterns: {
                files: filePatterns,
                directories: directoryPatterns
              },
              found_files: foundFiles.map(f => path.relative(workspacePath, f)),
              found_directories: foundDirectories.map(d => path.relative(workspacePath, d)),
              results: results
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`파일 콘텐츠 추출 실패: ${error.message}`);
    }
  }

  /**
   * 프롬프트에서 파일 패턴 추출
   */
  extractFilePatterns(prompt) {
    const patterns = [];
    
    // 다양한 파일 패턴 매칭
    const fileRegexes = [
      /([a-zA-Z0-9_\-\.\/\\]+\.[a-zA-Z0-9]+)/g,    // 확장자가 있는 파일
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

  /**
   * 프롬프트에서 디렉토리 패턴 추출
   */
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

  /**
   * 파일 패턴으로 실제 파일 찾기
   */
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

  /**
   * 파일 패턴 찾기 - 와일드카드 지원
   */
  async findFiles(pattern, workspacePath) {
    try {
      const searchPath = path.isAbsolute(pattern) ? pattern : path.join(workspacePath, pattern);
      
      if (pattern.includes('*') || pattern.includes('?')) {
        // 와일드카드 패턴
        const files = await glob(searchPath, {
          ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '.next/**'],
          absolute: true
        });
        return files.filter(file => fs.statSync(file).isFile());
      } else {
        // 정확한 경로
        if (fs.existsSync(searchPath) && fs.statSync(searchPath).isFile()) {
          return [searchPath];
        }
        return [];
      }
    } catch (error) {
      console.error(`파일 찾기 오류: ${pattern} - ${error.message}`);
      return [];
    }
  }
}
