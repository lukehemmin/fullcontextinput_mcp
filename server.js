#!/usr/bin/env node

/**
 * FullContextInput MCP 서버 진입점
 * 
 * 리팩토링된 모듈식 구조:
 * - src/core/ : 핵심 기능 (BaseServer, FileUtils)
 * - src/handlers/ : 기능별 핸들러 (File, Directory, Analysis, Write)  
 * - src/tools/ : MCP 도구 정의
 * - server.js : 메인 진입점 (간소화됨)
 * 
 * 버전: 1.1.0
 * 마지막 업데이트: 2025-07-30
 */

import { FullContextInputMCPServer } from './src/FullContextInputMCPServer.js';

// 서버 인스턴스 생성 및 실행
const server = new FullContextInputMCPServer();

// 에러 핸들링
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// 서버 시작
server.run().catch((error) => {
  console.error('서버 시작 실패:', error);
  process.exit(1);
});
