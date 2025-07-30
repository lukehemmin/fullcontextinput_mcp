import fs from 'fs';
import path from 'path';

/**
 * 파일 관련 유틸리티 함수들
 */
export class FileUtils {
  /**
   * 파일 우선순위 계산
   * @param {string} relativePath - 상대 경로
   * @param {string} extension - 파일 확장자
   * @param {number} size - 파일 크기
   * @returns {number} 우선순위 점수
   */
  static calculateFilePriority(relativePath, extension, size) {
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

  /**
   * 기본 코드 파일 확장자 목록 반환
   * @returns {string[]} 확장자 배열
   */
  static getDefaultExtensions() {
    return [
      'js', 'ts', 'jsx', 'tsx', 'vue', 'svelte', 'py', 'java', 'cpp', 'c', 'h', 'hpp',
      'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'clj', 'dart', 'r',
      'css', 'scss', 'sass', 'less', 'html', 'htm', 'xml', 'json', 'yaml', 'yml',
      'md', 'markdown', 'txt', 'sql', 'sh', 'bash', 'ps1', 'dockerfile', 'makefile'
    ];
  }

  /**
   * 파일이 지정된 확장자 중 하나인지 확인
   * @param {string} filePath - 파일 경로
   * @param {string[]} extensions - 허용된 확장자 목록
   * @returns {boolean} 포함 여부
   */
  static hasValidExtension(filePath, extensions) {
    const ext = path.extname(filePath).slice(1).toLowerCase();
    return extensions.includes(ext);
  }

  /**
   * 파일 확장자 반환
   * @param {string} filePath - 파일 경로
   * @returns {string} 확장자 (소문자)
   */
  static getFileExtension(filePath) {
    return path.extname(filePath).slice(1).toLowerCase();
  }

  /**
   * 파일 정보 객체 생성
   * @param {string} filePath - 파일 경로
   * @param {string} basePath - 기준 경로
   * @returns {Object} 파일 정보
   */
  static createFileInfo(filePath, basePath) {
    const stats = fs.statSync(filePath);
    const relativePath = path.relative(basePath, filePath);
    const extension = FileUtils.getFileExtension(filePath);
    const priority = FileUtils.calculateFilePriority(relativePath, extension, stats.size);

    return {
      file: filePath,
      relativePath,
      size: stats.size,
      modified: stats.mtime.toISOString(),
      extension,
      priority,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      lineCount: null // 필요시 계산
    };
  }

  /**
   * 파일의 라인 수 계산
   * @param {string} filePath - 파일 경로
   * @returns {number} 라인 수
   */
  static getFileLineCount(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return content.split('\n').length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 파일 크기를 KB 단위로 반환
   * @param {number} bytes - 바이트 크기
   * @returns {number} KB 크기 (소수점 1자리)
   */
  static bytesToKB(bytes) {
    return Math.round(bytes / 1024 * 10) / 10;
  }

  /**
   * 백업 파일 경로 생성
   * @param {string} filePath - 원본 파일 경로
   * @returns {string} 백업 파일 경로
   */
  static createBackupPath(filePath) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = path.extname(filePath);
    const name = path.basename(filePath, ext);
    const dirPath = path.dirname(filePath);
    
    return path.join(dirPath, `${name}_backup_${timestamp}${ext}`);
  }

  /**
   * 디렉토리가 존재하지 않으면 생성
   * @param {string} dirPath - 디렉토리 경로
   */
  static ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * 파일이 텍스트 파일인지 확인 (바이너리 체크)
   * @param {string} filePath - 파일 경로
   * @returns {boolean} 텍스트 파일 여부
   */
  static isTextFile(filePath) {
    try {
      const buffer = fs.readFileSync(filePath);
      const slice = buffer.slice(0, Math.min(1024, buffer.length));
      
      // NULL 바이트가 있으면 바이너리로 간주
      for (let i = 0; i < slice.length; i++) {
        if (slice[i] === 0) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
}
