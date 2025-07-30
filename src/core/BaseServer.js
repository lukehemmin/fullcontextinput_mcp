import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

/**
 * MCP 서버의 기본 기능을 제공하는 베이스 클래스
 * Rate Limiting, 캐시, 기본 서버 설정을 담당
 */
export class BaseServer {
  constructor(name = 'fullcontextinput_mcp', version = '1.1.0') {
    // MCP 서버 초기화
    this.server = new Server({
      name,
      version,
    }, {
      capabilities: {
        tools: {},
        resources: {},
      },
    });

    // Rate Limiting 설정
    this.rateLimiter = {
      lastRequestTime: 0,
      minDelay: 1000, // 최소 1초 대기
      requestCount: 0,
      resetTime: Date.now() + 60000 // 1분마다 리셋
    };
    
    // 파일 캐시 (중복 요청 방지)
    this.fileCache = new Map();
    this.cacheTimeout = 30000; // 30초 캐시
  }

  /**
   * Rate Limiting 및 지연 처리
   * 서버 과부하 방지를 위한 요청 제한
   */
  async waitForRateLimit() {
    const now = Date.now();
    
    // 1분마다 카운터 리셋
    if (now > this.rateLimiter.resetTime) {
      this.rateLimiter.requestCount = 0;
      this.rateLimiter.resetTime = now + 60000;
    }
    
    // 요청 수 증가
    this.rateLimiter.requestCount++;
    
    // 최소 대기 시간 계산
    const timeSinceLastRequest = now - this.rateLimiter.lastRequestTime;
    let delayNeeded = this.rateLimiter.minDelay - timeSinceLastRequest;
    
    // 요청이 많을수록 더 오래 대기
    if (this.rateLimiter.requestCount > 10) {
      delayNeeded = Math.max(delayNeeded, 2000); // 2초 대기
    } else if (this.rateLimiter.requestCount > 5) {
      delayNeeded = Math.max(delayNeeded, 1500); // 1.5초 대기
    }
    
    // 대기 시간이 있으면 대기
    if (delayNeeded > 0) {
      await new Promise(resolve => setTimeout(resolve, delayNeeded));
    }
    
    // 마지막 요청 시간 업데이트
    this.rateLimiter.lastRequestTime = Date.now();
  }

  /**
   * 파일 캐시 조회
   * @param {string} filePath - 파일 경로
   * @returns {Object|null} 캐시된 내용 또는 null
   */
  getCachedFile(filePath) {
    const cached = this.fileCache.get(filePath);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    if (cached) {
      this.fileCache.delete(filePath); // 만료된 캐시 삭제
    }
    return null;
  }

  /**
   * 파일 캐시 저장
   * @param {string} filePath - 파일 경로
   * @param {Object} data - 저장할 데이터
   */
  setCachedFile(filePath, data) {
    // 캐시 크기 제한 (100개)
    if (this.fileCache.size >= 100) {
      const oldestKey = this.fileCache.keys().next().value;
      this.fileCache.delete(oldestKey);
    }
    
    this.fileCache.set(filePath, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 파일 캐시 무효화
   * @param {string} filePath - 파일 경로
   */
  invalidateCache(filePath) {
    this.fileCache.delete(filePath);
  }

  /**
   * 캐시 전체 정리
   */
  clearCache() {
    this.fileCache.clear();
  }

  /**
   * 서버 시작
   */
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`${this.server.name} MCP 서버가 시작되었습니다.`);
  }

  /**
   * 서버 인스턴스 반환
   */
  getServer() {
    return this.server;
  }
}
