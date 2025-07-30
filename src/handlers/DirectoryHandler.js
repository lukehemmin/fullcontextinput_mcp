import fs from 'fs';
import path from 'path';
import { FileUtils } from '../core/FileUtils.js';

/**
 * 디렉토리 관련 기능을 담당하는 핸들러
 */
export class DirectoryHandler {
  constructor(baseServer) {
    this.baseServer = baseServer;
  }

  /**
   * 디렉토리 구조와 파일 메타데이터만 제공 (내용 제외)
   */
  async readDirectoryStructure(directoryPath, maxDepth = 10, includeExtensions = null) {
    try {
      await this.baseServer.waitForRateLimit();
      
      const fullPath = path.resolve(directoryPath);
      
      // 디렉토리 존재 확인
      const stats = fs.statSync(fullPath);
      if (!stats.isDirectory()) {
        throw new Error(`경로가 디렉토리가 아닙니다: ${fullPath}`);
      }
      
      // 기본 확장자 설정
      const extensions = includeExtensions || FileUtils.getDefaultExtensions();
      
      const allFiles = [];
      const directoryStructure = [];
      
      // 재귀적으로 파일 수집 (메타데이터만)
      await this.collectFilesMetadata(fullPath, allFiles, directoryStructure, extensions, 0, maxDepth);
      
      // 파일 메타데이터 생성
      const filesMetadata = [];
      for (const filePath of allFiles) {
        try {
          const fileInfo = FileUtils.createFileInfo(filePath, fullPath);
          fileInfo.lineCount = FileUtils.getFileLineCount(filePath);
          
          // 청킹 정보 추가
          if (fileInfo.lineCount > 200) {
            fileInfo.chunksNeeded = Math.ceil(fileInfo.lineCount / 200);
            fileInfo.recommendedTool = 'read_file_smart';
          } else {
            fileInfo.chunksNeeded = 1;
            fileInfo.recommendedTool = 'read_file_content';
          }
          
          filesMetadata.push(fileInfo);
        } catch (error) {
          filesMetadata.push({
            file: filePath,
            relativePath: path.relative(fullPath, filePath),
            error: error.message
          });
        }
      }
      
      // 우선순위별 정렬
      filesMetadata.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              directory: directoryPath,
              absolute_path: fullPath,
              total_files: allFiles.length,
              max_depth: maxDepth,
              included_extensions: extensions,
              directory_structure: directoryStructure,
              files_metadata: filesMetadata
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`디렉토리 구조 읽기 실패: ${directoryPath} - ${error.message}`);
    }
  }

  /**
   * 디렉토리의 모든 코드 파일을 재귀적으로 읽어 전체 컨텍스트 제공
   */
  async readDirectoryContext(directoryPath, maxDepth = 10, includeExtensions = null, maxFiles = 50, maxFileSize = 51200, maxTotalSize = 512000, prioritizeImportant = true) {
    try {
      // Rate Limiting 대기 (디렉토리는 더 오래 대기)
      await this.baseServer.waitForRateLimit();
      await new Promise(resolve => setTimeout(resolve, 500)); // 추가 0.5초 대기
      const fullPath = path.resolve(directoryPath);
      
      // 기본 코드 파일 확장자
      const extensions = includeExtensions || FileUtils.getDefaultExtensions();
      
      // 디렉토리 존재 확인
      if (!fs.existsSync(fullPath)) {
        throw new Error(`디렉토리가 존재하지 않습니다: ${directoryPath}`);
      }
      
      const stats = fs.statSync(fullPath);
      if (!stats.isDirectory()) {
        throw new Error(`지정된 경로는 디렉토리가 아닙니다: ${directoryPath}`);
      }
      
      // 재귀적으로 파일 수집
      const allFiles = [];
      const directoryStructure = [];
      
      await this.collectFilesRecursively(fullPath, allFiles, directoryStructure, extensions, 0, maxDepth);
      
      // 파일 우선순위 및 필터링
      const processedFiles = this.prioritizeAndFilterFiles(allFiles, fullPath, maxFiles, maxFileSize, prioritizeImportant);
      
      // 각 파일 내용 읽기 (컨텍스트 초과 방지)
      const fileContents = [];
      const skippedFiles = [];
      let totalSize = 0;
      
      for (const fileInfo of processedFiles) {
        try {
          // 최대 총 크기 검사
          if (totalSize + fileInfo.size > maxTotalSize) {
            skippedFiles.push({
              path: fileInfo.relativePath,
              size: fileInfo.size,
              reason: `최대 총 컨텍스트 크기 초과 (${Math.round(maxTotalSize/1024)}KB 제한)`
            });
            continue;
          }
          
          const content = fs.readFileSync(fileInfo.file, 'utf8');
          
          fileContents.push({
            path: fileInfo.relativePath,
            absolute_path: fileInfo.file,
            size: fileInfo.size,
            modified: fileInfo.modified,
            extension: fileInfo.extension,
            priority: fileInfo.priority,
            content: content
          });
          
          totalSize += fileInfo.size;
        } catch (error) {
          fileContents.push({
            path: fileInfo.relativePath,
            absolute_path: fileInfo.file,
            error: `파일 읽기 실패: ${error.message}`
          });
        }
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              directory: directoryPath,
              absolute_path: fullPath,
              total_files: allFiles.length,
              total_size: totalSize,
              max_depth: maxDepth,
              included_extensions: extensions,
              directory_structure: directoryStructure,
              files: fileContents,
              skipped_files: skippedFiles
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`디렉토리 컨텍스트 읽기 실패: ${directoryPath} - ${error.message}`);
    }
  }

  /**
   * 재귀적으로 파일 수집 (메타데이터만)
   */
  async collectFilesMetadata(dirPath, allFiles, directoryStructure, extensions, currentDepth, maxDepth) {
    if (currentDepth >= maxDepth) return;
    
    const items = fs.readdirSync(dirPath);
    const dirItems = [];
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      
      // 제외할 디렉토리들
      const excludeDirs = ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__'];
      if (excludeDirs.includes(item)) continue;
      
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        const subDirStructure = [];
        dirItems.push({
          name: item,
          type: 'directory',
          size: null,
          children: subDirStructure
        });
        
        await this.collectFilesMetadata(itemPath, allFiles, subDirStructure, extensions, currentDepth + 1, maxDepth);
      } else if (stats.isFile() && FileUtils.hasValidExtension(itemPath, extensions)) {
        allFiles.push(itemPath);
        dirItems.push({
          name: item,
          type: 'file',
          size: stats.size,
          extension: FileUtils.getFileExtension(itemPath),
          modified: stats.mtime.toISOString()
        });
      }
    }
    
    directoryStructure.push(...dirItems);
  }

  /**
   * 재귀적으로 파일 수집 (전체 컨텍스트용)
   */
  async collectFilesRecursively(dirPath, allFiles, directoryStructure, extensions, currentDepth, maxDepth) {
    if (currentDepth >= maxDepth) return;
    
    const items = fs.readdirSync(dirPath);
    const dirItems = [];
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      
      // 제외할 디렉토리들
      const excludeDirs = ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 'coverage'];
      if (excludeDirs.includes(item)) continue;
      
      try {
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          const subDirStructure = [];
          dirItems.push({
            name: item,
            type: 'directory',
            path: path.relative(path.dirname(dirPath), itemPath),
            children: subDirStructure
          });
          
          await this.collectFilesRecursively(itemPath, allFiles, subDirStructure, extensions, currentDepth + 1, maxDepth);
        } else if (stats.isFile() && FileUtils.hasValidExtension(itemPath, extensions)) {
          allFiles.push(itemPath);
          dirItems.push({
            name: item,
            type: 'file',
            path: path.relative(path.dirname(dirPath), itemPath),
            size: stats.size,
            modified: stats.mtime.toISOString()
          });
        }
      } catch (error) {
        // 읽기 권한 오류 등 무시
        console.error(`파일 읽기 실패: ${itemPath} - ${error.message}`);
      }
    }
    
    directoryStructure.push(...dirItems);
  }

  /**
   * 파일 우선순위 및 필터링
   */
  prioritizeAndFilterFiles(allFiles, basePath, maxFiles, maxFileSize, prioritizeImportant) {
    const filesWithInfo = allFiles.map(filePath => {
      try {
        const fileInfo = FileUtils.createFileInfo(filePath, basePath);
        
        // 파일 크기 필터링
        if (fileInfo.size > maxFileSize) {
          return null;
        }
        
        return fileInfo;
      } catch (error) {
        return null;
      }
    }).filter(info => info !== null);
    
    // 우선순위별 정렬
    if (prioritizeImportant) {
      filesWithInfo.sort((a, b) => b.priority - a.priority);
    }
    
    return filesWithInfo.slice(0, maxFiles);
  }
}
